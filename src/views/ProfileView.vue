<template>
  <div class="page">
    <aside class="sidebar">
      <div class="sidebar-title">Settings</div>
      <div class="nav-item" @click="goBack">
        ← 返回聊天
      </div>
    </aside>

    <main class="content">
      <header class="header">
        <h2>个人信息</h2>
      </header>

      <section class="section">
        <div class="avatar-section">
          <div class="preview">
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" />
            <span v-else class="avatar-text">{{ username.slice(0, 1) }}</span>
          </div>
          <div class="avatar-actions">
            <label class="btn">选择图片
              <input type="file" accept="image/jpeg,image/png,image/gif" hidden @change="onFileChange" />
            </label>
            <button class="btn primary" @click="uploadAvatar" :disabled="!file || uploading">
              {{ uploading ? '上传中...' : '上传头像' }}
            </button>
          </div>
          <p v-if="avatarMsg" class="msg">{{ avatarMsg }}</p>
        </div>
      </section>

      <section class="section">
        <h3>修改用户名</h3>
        <form @submit.prevent="updateUsername" class="form-row">
          <input v-model="nameForm" type="text" maxlength="12" placeholder="新用户名 (1-12字符)" />
          <button type="submit" class="btn primary" :disabled="nameSaving">{{ nameSaving ? '保存中...' : '保存' }}</button>
        </form>
        <p v-if="nameMsg" class="msg">{{ nameMsg }}</p>
      </section>

      <section class="section">
        <h3>修改密码</h3>
        <form @submit.prevent="updatePassword" class="form-col">
          <input v-model="pwdForm" type="password" maxlength="20" placeholder="新密码 (4-20字符)" />
          <button type="submit" class="btn primary" :disabled="pwdSaving">{{ pwdSaving ? '保存中...' : '保存' }}</button>
        </form>
        <p v-if="pwdMsg" class="msg">{{ pwdMsg }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '@/store/user'

const router = useRouter()
const username = ref(userStore.username)
const nameForm = ref('')
const nameMsg = ref('')
const nameSaving = ref(false)

const pwdForm = ref('')
const pwdMsg = ref('')
const pwdSaving = ref(false)

const file = ref(null)
const avatarPreview = ref(userStore.avatar ? 'http://localhost:9090' + userStore.avatar : '')
const avatarMsg = ref('')
const uploading = ref(false)

function goBack() {
  router.push('/chat')
}

function onFileChange(e) {
  const f = e.target.files[0]
  if (!f) return
  if (f.size > 200 * 1024) {
    avatarMsg.value = '图片不能超过200KB'
    return
  }
  file.value = f
  avatarPreview.value = URL.createObjectURL(f)
  avatarMsg.value = ''
}

async function uploadAvatar() {
  if (!file.value) return
  uploading.value = true
  avatarMsg.value = ''
  const form = new FormData()
  form.append('avatar', file.value)
  try {
    const res = await fetch('http://localhost:9090/api/avatar', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const data = await res.json()
    if (res.ok) {
      userStore.avatar = data.avatar
      avatarMsg.value = '头像更新成功'
      file.value = null
    } else {
      avatarMsg.value = data.error || '上传失败'
    }
  } catch {
    avatarMsg.value = '网络错误'
  } finally {
    uploading.value = false
  }
}

async function updateUsername() {
  if (!nameForm.value.trim()) return
  nameSaving.value = true
  nameMsg.value = ''
  try {
    const res = await fetch('http://localhost:9090/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: nameForm.value }),
    })
    const data = await res.json()
    if (res.ok) {
      userStore.username = nameForm.value
      username.value = nameForm.value
      nameForm.value = ''
      nameMsg.value = '用户名修改成功'
    } else {
      nameMsg.value = data.error || '修改失败'
    }
  } catch {
    nameMsg.value = '网络错误'
  } finally {
    nameSaving.value = false
  }
}

async function updatePassword() {
  if (!pwdForm.value) return
  pwdSaving.value = true
  pwdMsg.value = ''
  try {
    const res = await fetch('http://localhost:9090/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: pwdForm.value }),
    })
    const data = await res.json()
    if (res.ok) {
      pwdForm.value = ''
      pwdMsg.value = '密码修改成功'
    } else {
      pwdMsg.value = data.error || '修改失败'
    }
  } catch {
    pwdMsg.value = '网络错误'
  } finally {
    pwdSaving.value = false
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.page {
  height: 100vh;
  display: flex;
  background: #eef1f5;
  color: #1f2937;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

.nav-item {
  padding: 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: 0.2s;
  font-size: 15px;
}

.nav-item:hover {
  background: #1f2937;
}

.content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}

.header {
  margin-bottom: 24px;
}

.header h2 {
  font-size: 24px;
  font-weight: 700;
}

.section {
  background: white;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #60a5fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.avatar-actions {
  display: flex;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input[type="text"],
input[type="password"] {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
}

input:focus {
  border-color: #2563eb;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #e5e7eb;
  color: #1f2937;
  transition: 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.primary {
  background: #2563eb;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.msg {
  font-size: 13px;
  color: #6b7280;
  margin-top: 8px;
}
</style>