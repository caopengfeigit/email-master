<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { store } from "@/store";
import { sendApiRequest } from "@/api"; // 引入 sendApiRequest
import { socketManager } from "@/socketApi"; // 引入 socketManager

// 用于存储输入的用户名和密码
const username = ref<string>("");
const password = ref<string>("");

// 用于控制是否显示登录错误信息
const showError = ref<boolean>(false);

// 路由对象，用于跳转
const router = useRouter();

// 登录函数
const handleLogin = () => {
  try {
    // 使用相对的 endpoint
    const response = sendApiRequest("POST", "ums/user/login-by-username", {
      username: username.value,
      password: password.value,
    });

    response
      .then(async (result: any) => {
        // Handle success, result will contain the resolved value
        console.log("Success:", result);
        // 登录成功时可能要保存一些用户信息
        store.setters.updateStore({ key: "user", value: result.data });
        // 登录成功后调用 Tauri 命令启动 WebSocket 连接
        const token = result.data.token; // 假设返回的数据中有 token
        // 登录成功后启动 WebSocket 连接// 登录成功后启动 WebSocket 连接
        await socketManager.connect(); // 在登录成功后建立 WebSocket 连接

        // 跳转到首页
        router.replace("/");
      })
      .catch((error) => {
        // Handle failure, error will contain the rejected value
        // console.log("Error:", error);
        showError.value = true;
      });
  } catch (error) {
    console.error(error);
    showError.value = true;
  }
};
</script>

<template>
  <div class="w-screen h-screen flex justify-center items-center">
    <div class="w-[300px] bg-white p-6 rounded-lg shadow-lg">
      <h2 class="text-center text-xl font-semibold mb-4">登录</h2>

      <!-- 输入框 -->
      <div class="mb-4">
        <label for="username" class="block text-sm font-medium text-gray-700"
          >账户</label
        >
        <input
          id="username"
          v-model="username"
          type="text"
          placeholder="请输入账户"
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div class="mb-4">
        <label for="password" class="block text-sm font-medium text-gray-700"
          >密码</label
        >
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="请输入密码"
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <!-- 登录按钮 -->
      <button
        @click="handleLogin"
        class="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 focus:outline-none"
      >
        登录
      </button>

      <!-- 错误信息 -->
      <div v-if="showError" class="mt-4 text-center text-red-600">
        用户名或密码错误，请重试。
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基本页面样式 */
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.w-screen {
  width: 100vw;
}

.h-screen {
  height: 100vh;
}

.bg-black {
  background-color: #000;
  opacity: 0.7;
}

.bg-white {
  background-color: #fff;
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 0.875rem;
}

.font-medium {
  font-weight: 500;
}

.text-gray-700 {
  color: #4a5568;
}

.text-red-600 {
  color: #e53e3e;
}

.text-blue-600 {
  color: #3182ce;
}

.text-xl {
  font-size: 1.25rem;
}

.text-white {
  color: #fff;
}

/* 登录框样式 */
.login-container {
  max-width: 400px;
  padding: 1.5rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.login-container h2 {
  font-size: 1.5rem;
  color: #333;
  font-weight: 600;
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  color: #333;
  background-color: #f7fafc;
  transition: all 0.2s ease-in-out;
}

.input-field:focus {
  border-color: #3182ce;
  outline: none;
}

.input-field::placeholder {
  color: #a0aec0;
}

/* 错误信息 */
.error-message {
  margin-top: 0.5rem;
  color: #e53e3e;
  font-size: 0.875rem;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #000f1d;
  color: #fff;
  font-size: 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.login-button:hover {
  background-color: #010a1594;
}

/* 页面布局 */
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #000;
}

.login-wrapper {
  width: 100%;
  max-width: 360px;
  padding: 2rem;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 响应式 */
@media (max-width: 500px) {
  .login-wrapper {
    width: 90%;
    padding: 1.5rem;
  }
}
</style>
