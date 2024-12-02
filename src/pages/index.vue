<script setup lang="ts">
import { computed, ref } from "vue";
import ModalComponentsRenderer from "@/components/ModalComponentsRenderer.vue";
import Navigation from "@/components/Navigation.vue";
import SideBar from "@/components/SideBar.vue";
import { store } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/shadcn";
import { Toaster } from "@/components/ui/sonner";
import { RouterView } from "vue-router";
import { useRouter } from "vue-router";

// 获取 modal 显示状态和名称
const show = computed(() => store.getters.getModalVisibility());
const name = computed(() => store.getters.getModalName());

// 获取用户信息，登录后显示相应组件
const user = computed(() => store.getters.getUser());
const isCollapse = ref<boolean>(false);
const router = useRouter();

// 更新邮件列表数据
const updateMailList = (mails: any[]) => {
  store.dispatch("updateSelectedMails", mails); // 更新 Vuex Store 中的邮件数据
};

// 更新选中的组中的列表菜单status
const updateSelectedMenuGroup = (status: number) => {
  // 更新当前状态值
  store.dispatch("updateSelectedMenuGroup", status);
}

// 更新选中的组id
const updateSelectedGid = (id: number) => {
  // 更新当前状态值
  store.dispatch("updateSelectedGid", id);
}

// 如果没有登录，跳转到登录页面
if (!user.value) {
  router.replace({ path: "/login" });
}
</script>

<template>
  <main class="w-screen h-screen fixed top-0 left-0 bg-[#FFFAFA] flex">
    <!-- 只在登录后显示 Navigation 和 SideBar -->
    <div
      v-show="user"
      :class="
        cn(
          'transition-all print:hidden sticky h-screen top-0 border-r border-slate-100 z-50 flex justify-center duration-200',
          isCollapse ? 'w-12 min-w-[48px]' : 'w-52 min-w-[15rem]'
        )
      "
    >
      <SideBar v-model:collapse="isCollapse" @updateMailList="updateMailList" @updateSelectedMenuGroup="updateSelectedMenuGroup" @updateSelectedGid="updateSelectedGid" />
    </div>

    <div class="grid grid-rows-[50px_1fr] w-full">
      <!-- 只在登录后显示 Navigation -->
      <Navigation v-show="user" />

      <ScrollArea
        class="w-full scroll-smooth h-[calc(100vh-50px)] flex flex-col border-t border-slate-100"
      >
        <!-- Modal 弹窗显示 -->
        <div
          v-if="show"
          class="w-full h-full flex items-center justify-center fixed bg-black z-50 top-0 left-0 bg-opacity-30"
        >
          <ModalComponentsRenderer :name="name" />
        </div>

        <div class="w-full bg-[#FFFAFA] p-2 rounded-md h-full">
          <!-- 这里会渲染 RouterView，显示不同的页面内容 -->
          <RouterView />
        </div>
      </ScrollArea>
    </div>

    <Toaster position="top-center" />
  </main>
</template>
