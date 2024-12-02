<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { store } from "@/store"; // 引入 store

// 当前选中的邮箱
const email = ref(null);

// 动态获取 store 中的邮件数据
const mails = computed(() => {
  if (!email.value) return [];
  return store.getters.getMailData[email.value.id] || []; // 从 store 获取邮件列表
});

// 存储选中的邮件
const selectedMails = ref<number[]>([]);

// 选择或取消选择邮件
const selectMail = (mail: any) => {
  const mailIndex = selectedMails.value.indexOf(mail.id);
  if (mailIndex === -1) {
    selectedMails.value.push(mail.id); // 如果邮件没有被选中，则添加到选中的数组
  } else {
    selectedMails.value.splice(mailIndex, 1); // 如果邮件已经选中，则移除
  }
};

// 监听选中的邮箱变化
watch(
  () => store.state.selectedEmail, // 监听 store 中的选中邮箱
  (newEmail) => {
    email.value = newEmail;
  },
  { immediate: true }
);
</script>

<template>
  <div class="w-full h-1/2 border-b border-gray-200">
    <h2 class="text-lg font-semibold p-3">
      {{ email ? `${email.email} 的所有邮件` : "请选择邮箱" }}
    </h2>
    <!-- 表格容器 -->
    <div class="overflow-y-auto" style="height: calc(72vh - 4rem)">
      <table class="w-full text-xs table-box">
        <thead class="sticky top-0 bg-gray-100 text-xs">
          <tr>
            <th class="text-left p-2">选择</th>
            <th class="text-left p-2">序号</th>
            <th class="text-left p-2">发件人</th>
            <th class="text-left p-2">主题</th>
            <th class="text-left p-2">日期</th>
          </tr>
        </thead>
        <tbody>
          <!-- 如果邮件列表为空 -->
          <tr v-if="!mails.length">
            <td colspan="5" class="text-center text-gray-500 p-4 pt-3">
              暂无数据
            </td>
          </tr>
          <!-- 如果邮件列表不为空 -->
          <tr
            v-else
            v-for="mail in mails"
            :key="mail.id"
            class="hover:bg-gray-100"
            :class="{ 'selected-row': selectedMails.includes(mail.id) }"
            @click="selectMail(mail)"
          >
            <td class="p-1 text-xs">
              <input
                type="checkbox"
                :checked="selectedMails.includes(mail.id)"
                @click.stop="selectMail(mail)"
              />
            </td>
            <td class="p-1 text-xs">{{ mail.id }}</td>
            <td class="p-1 text-xs">{{ mail.sender }}</td>
            <td class="p-1 text-xs">{{ mail.subject }}</td>
            <td class="p-1 text-xs">{{ mail.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* 确保表头固定 */
thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 12px;
}

.table-box {
  font-size: 12px;
}

div:has(> table:not(.not-default)) {
  overflow: scroll !important;
  margin: 0;
}

td,
th {
  padding: 0.5rem;
}

/* 选中的行背景色 */
.selected-row {
  background-color: rgb(219 234 254 / var(--tw-bg-opacity));
}
</style>
