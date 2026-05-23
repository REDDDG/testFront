<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Register</h1>
      <p>创建账号，开始聊天</p>

      <form @submit.prevent="register">
        <input v-model="username" maxlength="12" placeholder="用户名" />
        <input v-model="password" type="password" maxlength="20" placeholder="密码" />
        <input v-model="confirmPassword" type="password" maxlength="20" placeholder="确认密码" />

        <button type="submit">注册</button>
      </form>

      <div class="link">
        已有账号？
        <RouterLink to="/login">去登录</RouterLink>
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
const confirmPassword = ref('')

async function register() {
  if (!username.value.trim() || !password.value.trim()) {
    alert('请输入用户名和密码')
    return
  }

  if (password.value !== confirmPassword.value) {
    alert('两次密码不一致')
    return
  }

  const res = await fetch('http://localhost:9090/api/register', {
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
    alert('注册失败')
    return
  }

  alert('注册成功，请登录')
  router.push('/login')
}
</script>

<style scoped>
.auth-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e, #0f172a);
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
  border-color: #0f766e;
}

button {
  margin-top: 8px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #0f766e;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  background: #115e59;
}

.link {
  margin-top: 20px;
  text-align: center;
  color: #6b7280;
}

a {
  color: #0f766e;
  text-decoration: none;
  font-weight: 700;
}
</style>