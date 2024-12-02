<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { logs } from "@/log";

// 引用日志容器元素
const logContainer = ref<HTMLDivElement | null>(null);

// 监听 logs.value 的变化
watch(
  () => logs.value,
  () => {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div
    ref="logContainer"
    class="w-full h-full overflow-y-auto p-3 bg-gray-800 select-text"
  >
    <ul class="text-xs font-mono">
      <li
        v-for="log in logs"
        :key="log.id"
        :class="{
          'text-info': log.type === 'info',
          'text-warning': log.type === 'warning',
          'text-error': log.type === 'error',
        }"
        class="py-1"
      >
        <span class="text-gray-400">{{ log.time }}</span> {{ log.message }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 允许文本选择 */
.select-text {
  user-select: text; /* 确保文本可选中 */
  -webkit-user-select: text;
}
/* 让日志内容更有间距和显示效果 */
li {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* info: 使用白色 */
.text-info {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity));
}

/* warning: 使用黄色 */
.text-warning {
  --tw-text-opacity: 1;
  color: rgb(251 191 36 / var(--tw-text-opacity)); /* Tailwind 的黄色 */
}

/* error: 使用红色 */
.text-error {
  --tw-text-opacity: 1;
  color: rgb(239 68 68 / var(--tw-text-opacity)); /* Tailwind 的红色 */
}
</style>