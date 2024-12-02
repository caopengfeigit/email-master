<script setup lang="ts">
import { ref, computed } from "vue";
import ModalComponentsRenderer from "@/components/ModalComponentsRenderer.vue";
import Navigation from "@/components/Navigation.vue";
import SideBar from "@/components/SideBar.vue";
import { store } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/shadcn";
import { Toaster } from "@/components/ui/sonner";
import { RouterView } from "vue-router";

// 控制模态框的显示状态
const show = computed(() => store.getters.getModalVisibility());
const name = computed(() => store.getters.getModalName());
const isCollapse = ref<boolean>(true);

// 存储邮件列表数据
const selectedMails = ref([]);

// 更新邮件列表的回调函数
const updateMailList = (mails: any[]) => {
  selectedMails.value = mails;
  console.log("邮件列表已更新：", mails); // 可用于调试
};
</script>

<template>
  <main class="w-screen h-screen fixed top-0 left-0 bg-[#FFFAFA] flex">
    <!-- 侧边栏 -->
    <div
      :class="
        cn(
          'transition-all print:hidden sticky h-screen top-0 border-r border-slate-100 z-50 flex justify-center duration-200',
          isCollapse ? 'w-12 min-w-[48px]' : 'w-52 min-w-[15rem]'
        )
      "
    >
      <SideBar v-model:collapse="isCollapse" @updateMailList="updateMailList" />
    </div>

    <!-- 主内容区域 -->
    <div class="grid grid-rows-[50px_1fr] w-full">
      <!-- 导航栏 -->
      <Navigation />

      <!-- 滚动内容区域 -->
      <ScrollArea
        class="w-full scroll-smooth h-[calc(100vh-50px)] flex flex-col border-t border-slate-100"
      >
        <!-- 模态框 -->
        <div
          v-if="show"
          class="w-full h-full flex items-center justify-center fixed bg-black z-50 top-0 left-0 bg-opacity-30"
        >
          <ModalComponentsRenderer :name="name" />
        </div>

        <!-- 页面内容 -->
        <div class="w-full bg-[#FFFAFA] p-2 rounded-md h-full">
          <RouterView />
        </div>
      </ScrollArea>
    </div>

    <!-- 全局消息提示 -->
    <Toaster position="top-center" />
  </main>
</template>
