<template>
  <div class="page">
    <aside class="sidebar">
      <div class="sidebar-title">Chats</div>

      <div
          v-for="(user,id) in contacts"
          :key="id"
          class="contact"
          :class="{ active:Number(id) === roomId }"
          @click="selectContact(user, id)"
      >
        <div class="avatar">{{ user.avatar }}</div>

        <div class="contact-info">
          <div class="contact-name">
            {{ user.name }}
            <span v-if="user.avatar !== '群'" class="online-dot" :class="{ online: onlineStatus[user.id] }"></span>
          </div>
          <div class="contact-desc">{{ user.desc }}</div>
        </div>
      </div>
    </aside>

    <main class="chat">
      <header class="chat-header">
        <div>
          <div class="chat-title">{{ activeContact.name }}</div>
          <div class="chat-status">
            {{ activeContact.avatar !== '群' ? (onlineStatus[activeContact.id] ? 'Online' : 'Offline') : 'Online' }}
          </div>
        </div>

        <div class="profile">
          <div class="profile-text">
            <div class="profile-name">{{ username }}</div>
            <div class="profile-role">Go / Vue Learner</div>
          </div>
          <div class="profile-avatar">{{ username.slice(0, 1) }}</div>
          <button class="logout-btn" @click="logout">退出</button>
        </div>
      </header>

      <section class="log">
        <div
            v-for="(item, index) in activeContact.messages"
            :key="index"
            class="message-row"
            :class="{ self: item.senderId === userid }"
        >

          <div class="profile-avatar">
            {{ item.senderName.slice(0, 1) }}
          </div>

          <div class="message-content">

            <div class="message-name">
              {{ item.senderName }}
            </div>

            <div class="message-bubble">
              <div class="message-text">
                {{ item.text }}
              </div>
            </div>

          </div>

        </div>
      </section>

      <form class="form" @submit.prevent="sendMessage">
        <textarea
            v-model="input"
            rows="3"
            maxlength="500"
            placeholder="输入消息，Ctrl + Enter 发送"
            @keydown.ctrl.enter.prevent="sendMessage"
        ></textarea>

        <button type="submit" class="send-btn">Send</button>
      </form>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '@/store/user'

const router = useRouter()

const input = ref('')
const username = ref('')
const userid = ref(0)
const roomId = ref(1)
let conn = null
let shouldReconnect = true
let reconnectTimer = null

const contacts = ref({
  1: {id: 1, name: '聊天室大厅', desc: '', avatar: '群', messages: []}
})

const onlineStatus = ref({})
let onlineTimer = null

const activeContact = ref(contacts.value[roomId.value])
onMounted(async () => {
  userid.value = userStore.id
  username.value = userStore.username

  const roomRes =await fetch("http://localhost:9090/api/rooms", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }
  )
  if(!roomRes.ok){
    logout()
  }
  const roomData = await roomRes.json()
  if(roomData.friends)for (const item of roomData.friends){
    contacts.value[item.roomId] =
        {
          id : item.friendId,
          name : item.friendName,
          desc: '',
          avatar : 'C',
          messages :[]
        }
  }
  if(roomData.rooms)for (const item of roomData.rooms){
    contacts.value[item.roomId] =
        {
          id : item.roomId,
          name : item.roomName,
          desc: '',
          avatar : '群',
          messages :[]
        }
  }
  await loadMessages(roomId.value)
  connectWebSocket()

  await fetchOnlineStatus()
  onlineTimer = setInterval(fetchOnlineStatus, 30000)
})

function connectWebSocket() {
  if (conn && conn.readyState === WebSocket.OPEN) return
  if (reconnectTimer) clearTimeout(reconnectTimer)

  conn = new WebSocket('ws://localhost:9090/ws')

  conn.onmessage = (event) => {
    const data = JSON.parse(event.data)
    const room = contacts.value[data.roomId]
    if (!room) return
    room.messages.push(
        {
          senderId: data.senderId,
          text: data.text,
          senderName: data.senderName,
        }
    )
    room.desc = data.text
  }

  conn.onclose = () => {
    if (shouldReconnect) {
      reconnectTimer = setTimeout(connectWebSocket, 3000)
    }
  }

  conn.onerror = () => {
    conn.close()
  }
}

onUnmounted(() => {
  shouldReconnect = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (onlineTimer) clearInterval(onlineTimer)
  if (conn) {
    conn.close()
  }
})

function selectContact(user, id) {
  activeContact.value = user
  roomId.value = Number(id)
  if (contacts.value[Number(id)].messages.length === 0) {
    loadMessages(Number(id))
  }
}

async function loadMessages(roomId) {
  try {
    const res = await fetch(`http://localhost:9090/api/messages?roomId=${roomId}&limit=50`, {
      credentials: 'include'
    })
    if (!res.ok) {
      console.warn('loadMessages: HTTP', res.status, 'for roomId', roomId)
      return
    }
    const data = await res.json()
    if (!contacts.value[roomId]) {
      contacts.value[roomId] = { id: roomId, name: '', desc: '', avatar: '', messages: [] }
    }
    data.messages.reverse()
    contacts.value[roomId].messages = data.messages
    // Bug 1 fix: 同步 activeContact 到最新的 contacts 对象引用
    activeContact.value = contacts.value[roomId]
  } catch (e) {
    console.error('loadMessages failed:', e)
  }
}

async function fetchOnlineStatus() {
  try {
    const ids = Object.values(contacts.value)
      .filter(c => c.avatar !== '群')
      .map(c => c.id)
    const res = await fetch('http://localhost:9090/api/online-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids })
    })
    if (!res.ok) return
    const data = await res.json()
    onlineStatus.value = data.online || {}
  } catch (e) {
    console.error('fetchOnlineStatus failed:', e)
  }
}

function sendMessage() {
  if (!conn) return
  if (conn.readyState !== WebSocket.OPEN) return
  if (!input.value.trim()) return
  const text = `${input.value}`
  const msg={
    roomId:roomId.value,
    text:text,
    senderId:userid.value,
    senderName:username.value,
  }
  conn.send(JSON.stringify(msg))
  // 乐观渲染：服务端不再回显，直接本地追加
  if (contacts.value[roomId.value]) {
    contacts.value[roomId.value].messages.push({...msg})
    contacts.value[roomId.value].desc = text
  }
  input.value = ''
}

function logout() {
  shouldReconnect = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (conn) {
    conn.close()
  }
  fetch("http://localhost:9090/api/logout", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }
  )
  router.push('/login')
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page {
  height: 100vh;
  display: flex;
  background: #eef1f5;
  color: #1f2937;
  font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
}

.sidebar {
  width: 260px;
  padding: 16px;
  background: #111827;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
}

.contact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.contact:hover {
  background: #1f2937;
}

.contact.active {
  background: #2563eb;
}

.avatar,
.profile-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #60a5fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.contact-info {
  overflow: hidden;
}

.contact-name {
  font-size: 15px;
  font-weight: 600;
}

.online-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
  margin-left: 6px;
  vertical-align: middle;
}
.online-dot.online {
  background: #22c55e;
}

.contact-desc {
  font-size: 12px;
  color: #cbd5e1;
  margin-top: 4px;
}

.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  height: 72px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-size: 20px;
  font-weight: 700;
}

.chat-status {
  font-size: 13px;
  color: #22c55e;
  margin-top: 4px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-text {
  text-align: right;
}

.profile-name {
  font-weight: 700;
}

.profile-role {
  font-size: 12px;
  color: #6b7280;
}

.logout-btn {
  width: 64px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  cursor: pointer;
}

.log {
  flex: 1;
  padding: 24px;
  overflow: auto;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}
.message-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}
.message-name {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #64748b;
}
.message-bubble {
  width: fit-content;
  max-width: 100%;

  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);

  white-space: pre-wrap;
  overflow-wrap: break-word;

  line-height: 1.5;
  padding: 12px 16px;
}

.form {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
}
.message-row.self {
  justify-content: flex-end;
}
.message-row.self .message-content {
  align-items: flex-end;
}
.message-row.self .profile-avatar {
  order: 2;

  margin-left: 0;
  margin-right: 0;
}
.message-row.self .message-bubble {
  background: #2563eb;
}
textarea {
  flex: 1;
  resize: none;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
}

textarea:focus {
  border-color: #2563eb;
}

.send-btn {
  width: 96px;
  border: none;
  border-radius: 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.send-btn:hover {
  background: #1d4ed8;
}
</style>
