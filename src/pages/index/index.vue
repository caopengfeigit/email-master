<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { invoke } from "@tauri-apps/api/tauri"; // 导入 Tauri API
import { socketManager } from "@/socketApi"; // 导入 WebSocket 管理器
import { store } from "@/store";
import EmailList from "./EmailList.vue";
import TerminalStatus from "./TerminalStatus.vue";
import MailList from "./MailList.vue";

// WebSocket 管理
const selectedEmail = ref([null]);

const startWebSocketServer = async () => {
  try {
    const response = await invoke("start_websocket_server");
    console.log(response);
  } catch (error) {
    console.error("Failed to start WebSocket server", error);
  }
};

const initializeWebSocket = async () => {
  if (socketManager.isConnected.value) {
    console.log("WebSocket is already connected, no need to reconnect.");
    return;
  }

  try {
    await socketManager.connect();
    console.log("WebSocket connection established.");
  } catch (error) {
    console.error("Failed to initialize WebSocket connection:", error);
  }
};

onMounted(async () => {
  // await startWebSocketServer(); // 如果需要启动 WebSocket 服务器
  await initializeWebSocket();
});

// 邮件选择处理函数
const handleEmailSelected = (email: any) => {
  console.log("handleEmailSelected", email);
  selectedEmail.value = email;
  const data = { type: "inboxMails", data: "1,2,3,4,5" }; // 示例数据
  socketManager.sendMessage(data);
};
</script>

<template>
  <div class="flex bg-gray-50">
    <!-- 左侧邮箱列表 -->
    <div class="w-3/5 h-full-c flex flex-col border-gray-200">
      <!-- 上半部分：邮箱列表 -->
      <div class="flex-grow overflow-auto">
        <EmailList @emailSelected="handleEmailSelected" />
      </div>
      <!-- 下半部分：终端状态 -->
      <div class="h-1/5 p-4 bg-gray-900 text-white rounded-lg">
        <TerminalStatus />
      </div>
    </div>

    <!-- 右侧内容区域 -->
    <div class="w-2/4 flex flex-col h-full-c">
      <!-- 上半部分：邮件列表 -->
      <div class="flex-grow p-4 bg-white">
        <MailList :email="selectedEmail" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式 */
.h-full-c {
  height: calc(100vh - 70px);
}
</style>
