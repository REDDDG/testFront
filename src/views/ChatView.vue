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
        <img v-if="getAvatarUrl(user.id)&&user.avatar!=='群'" :src="getAvatarUrl(user.id)" class="avatar" />
        <div v-else class="avatar">{{ user.avatar }}</div>

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
          <div class="profile-info" @click="goProfile">
            <div class="profile-text">
              <div class="profile-name">{{ username }}</div>
              <div class="profile-role">Go / Vue Learner</div>
            </div>
            <img v-if="avatarUrl" :src="avatarUrl" class="profile-avatar" />
            <div v-else class="profile-avatar">{{ username.slice(0, 1) }}</div>
          </div>
          <button class="logout-btn" @click="logout">退出</button>
        </div>
      </header>

      <section class="log" ref="logContainer" @scroll="onLogScroll">
        <div
            v-for="(item, index) in activeContact.messages"
            :key="index"
            class="message-row"
            :class="{ self: item.senderId === userid }"
        >

          <img v-if="getAvatarUrl(item.senderId)" :src="getAvatarUrl(item.senderId)" class="profile-avatar" />
          <div v-else class="profile-avatar">
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

        <div v-if="activeContact.unreadCount > 0" class="unread-banner">
          未读消息：{{ activeContact.unreadCount }}条
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '@/store/user'

const router = useRouter()
const avatarUrl = computed(() => userStore.avatar ? 'http://localhost:9090' + userStore.avatar : '')

// 头像缓存：{ [userId]: avatarPath }，持久化到 localStorage
const avatarCache = ref(loadAvatarCache())

function loadAvatarCache() {
  try {
    const raw = localStorage.getItem('chat_avatars')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveAvatarCache() {
  localStorage.setItem('chat_avatars', JSON.stringify(avatarCache.value))
}

function getAvatarUrl(senderId) {
  const path = avatarCache.value[senderId]
  return path ? 'http://localhost:9090' + path : ''
}

async function fetchAvatar(userId) {
  if (avatarCache.value[userId] !== undefined) return
  try {
    const res = await fetch(`http://localhost:9090/api/avatar?id=${userId}`)
    if (!res.ok) return
    const data = await res.json()
    avatarCache.value[userId] = data.avatar || ''
    saveAvatarCache()
  } catch { /* ignore */ }
}

function prefetchAvatars(messages) {
  const seen = new Set()
  for (const m of messages) {
    if (!seen.has(m.senderId)) {
      seen.add(m.senderId)
      fetchAvatar(m.senderId)
    }
  }
}

const input = ref('')
const username = ref('')
const userid = ref(0)
const roomId = ref(1)
const logContainer = ref(null)
let conn = null
let shouldReconnect = true
let reconnectTimer = null

const contacts = ref({
  1: {id: 1, name: '聊天室大厅', desc: '', avatar: '群', messages: [], unreadCount: 0}
})

const onlineStatus = ref({})
let onlineTimer = null

const activeContact = ref(contacts.value[roomId.value])
onMounted(async () => {
  userid.value = userStore.id
  username.value = userStore.username
  if (userStore.avatar) {
    avatarCache.value[userStore.id] = userStore.avatar
    saveAvatarCache()
  }

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
          messages :[],
          unreadCount: 0
        }
  }
  if(roomData.rooms)for (const item of roomData.rooms){
    contacts.value[item.roomId] =
        {
          id : item.roomId,
          name : item.roomName,
          desc: '',
          avatar : '群',
          messages :[],
          unreadCount: 0
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
    room.messages.push({
      id: data.id,
      senderId: data.senderId,
      text: data.text,
      senderName: data.senderName,
    })
    room.desc = data.text
    fetchAvatar(data.senderId)
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
  loadMessages(Number(id))
}

async function loadMessages(roomId) {
  try {
    // 先尝试增量加载未读消息
    const unreadRes = await fetch(`http://localhost:9090/api/messages?roomId=${roomId}&type=unread&limit=50`, {
      credentials: 'include'
    })
    if (!unreadRes.ok) {
      console.warn('loadMessages unread: HTTP', unreadRes.status, 'for roomId', roomId)
      return
    }
    const unreadData = await unreadRes.json()
    if (!contacts.value[roomId]) {
      contacts.value[roomId] = { id: roomId, name: '', desc: '', avatar: '', messages: [], unreadCount: 0 }
    }

    if (unreadData.messages.length > 0) {
      // 有未读消息，ASC 顺序（旧→新），直接显示
      contacts.value[roomId].messages = unreadData.messages
      contacts.value[roomId].unreadCount = unreadData.unreadCount
    } else {
      // 无未读消息，加载默认最近 50 条历史
      const res = await fetch(`http://localhost:9090/api/messages?roomId=${roomId}&limit=50`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        data.messages.reverse()
        contacts.value[roomId].messages = data.messages
        contacts.value[roomId].unreadCount = 0
      }
    }
    prefetchAvatars(contacts.value[roomId].messages)
    activeContact.value = contacts.value[roomId]
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  } catch (e) {
    console.error('loadMessages failed:', e)
  }
}

async function loadMoreUnread(roomId) {
  const room = contacts.value[roomId]
  if (!room || room.unreadCount <= 0 || room._loadingMore) return

  const messages = room.messages
  if (messages.length === 0) return
  const lastMsg = messages[messages.length - 1]

  room._loadingMore = true
  try {
    const res = await fetch(`http://localhost:9090/api/messages?roomId=${roomId}&type=unread&limit=50&afterId=${lastMsg.id}`, {
      credentials: 'include'
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.messages.length > 0) {
      room.messages.push(...data.messages)
      room.unreadCount = data.unreadCount
      prefetchAvatars(data.messages)
    }
  } catch (e) {
    console.error('loadMoreUnread failed:', e)
  } finally {
    room._loadingMore = false
  }
}

function onLogScroll(event) {
  const el = event.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
    loadMoreUnread(roomId.value)
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

function goProfile() {
  router.push('/profile')
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
  object-fit: cover;
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

.profile-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border-radius: 12px;
  padding: 4px 8px;
  transition: 0.2s;
}

.profile-info:hover {
  background: #f3f4f6;
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

.unread-banner {
  text-align: center;
  padding: 10px 0;
  margin: 12px 0;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 8px;
}
</style>
