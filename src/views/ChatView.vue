<template>
  <div class="page">
    <aside class="sidebar">
      <div class="sidebar-title">Chats</div>

      <div
          v-for="user in contacts"
          :key="user.id"
          class="contact"
          :class="{ active: user.id === activeContact.id }"
          @click="activeContact = user"
      >
        <div class="avatar">{{ user.avatar }}</div>

        <div class="contact-info">
          <div class="contact-name">{{ user.name }}</div>
          <div class="contact-desc">{{ user.desc }}</div>
        </div>
      </div>
    </aside>

    <main class="chat">
      <header class="chat-header">
        <div>
          <div class="chat-title">{{ activeContact.name }}</div>
          <div class="chat-status">Online</div>
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
            v-for="(item, index) in messages"
            :key="index"
            class="message-row"
        >
          <div class="message-bubble">
            {{ item }}
          </div>
        </div>
      </section>

      <form class="form" @submit.prevent="sendMessage">
        <textarea
            v-model="input"
            rows="3"
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

const router = useRouter()

const input = ref('')
const messages = ref([])
const username = ref(localStorage.getItem('username'))

let conn = null

const contacts = ref([
  { id: 1, name: '聊天室大厅', desc: '公共频道', avatar: '群' },
  { id: 2, name: 'Alice', desc: '前端开发', avatar: 'A' },
  { id: 3, name: 'Bob', desc: 'Go 后端', avatar: 'B' },
  { id: 4, name: 'System', desc: '系统通知', avatar: 'S' },
])

const activeContact = ref(contacts.value[0])

onMounted(async () => {
  const res=await fetch("http://localhost:9090/api/me", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }
  )
  if(!res.ok){
    router.push('/login')
    return
  }
  const data = await res.json()
  username.value=data.username
  conn = new WebSocket('ws://localhost:9090/ws')

  conn.onopen = () => {
    messages.value.push('WebSocket connected.')
  }

  conn.onmessage = (event) => {
    messages.value.push(event.data)
    contacts.value[0].desc=event.data
  }

  conn.onclose = () => {
    messages.value.push('Connection closed.')
  }

  conn.onerror = (err) => {
    console.error('WebSocket error:', err)
  }
})

onUnmounted(() => {
  if (conn) {
    conn.close()
  }
})

function sendMessage() {
  if (!conn) return
  if (conn.readyState !== WebSocket.OPEN) return
  if (!input.value.trim()) return

  const text = `[${activeContact.value.name}] ${username.value}: ${input.value}`

  conn.send(text)
  input.value = ''
}

function logout() {
  localStorage.removeItem('username')
  sessionStorage.clear()
  if (conn) {
    conn.close()
  }

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

.message-bubble {
  max-width: 70%;
  padding: 12px 14px;
  background: white;
  border-radius: 16px 16px 16px 4px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  white-space: pre-wrap;
  line-height: 1.5;
}

.form {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
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