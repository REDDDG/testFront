<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Login</h1>
      <p>欢迎回来，请登录你的账号</p>

      <form @submit.prevent="login">
        <input v-model="username" placeholder="用户名" />
        <input v-model="password" type="password" placeholder="密码" />

        <button type="submit">登录</button>
      </form>

      <div class="link">
        没有账号？
        <RouterLink to="/register">去注册</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const password = ref('')

async function login() {
  if (!username.value.trim() || !password.value.trim()) {
    alert('请输入用户名和密码')
    return
  }

  const res = await fetch('http://localhost:9090/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  })

  if (!res.ok) {
    alert('登录失败')
    return
  }
  localStorage.setItem('username', username.value)

  router.push('/chat')
}
</script>

<style scoped>
.auth-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a, #0f172a);
}

.auth-card {
  width: 380px;
  padding: 32px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

h1 {
  margin: 0;
  font-size: 32px;
}

p {
  color: #6b7280;
  margin-bottom: 24px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

input {
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
}

input:focus {
  border-color: #2563eb;
}

button {
  margin-top: 8px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

.link {
  margin-top: 20px;
  text-align: center;
  color: #6b7280;
}

a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 700;
}
</style>