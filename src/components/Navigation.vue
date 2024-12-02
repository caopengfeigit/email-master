<script setup lang="ts">
import { useI18n } from "vue-i18n";
// import { RouteLinks } from "@/constants/RouteNames";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { store } from "@/store";
import { HomeIcon, ChevronLeft, ChevronRight } from "lucide-vue-next";

const { t } = useI18n();
// const route = useRoute();
// const ActiveLink = computed(() =>
//   RouteLinks.find((link) => link.path === route.path)
// );
const router = useRouter();
const logout = () => {
  // 更新 store 中的用户信息
  store.setters.updateStore({ key: "user", value: null }); // 这里设置为 null 清空用户信息
  localStorage.removeItem("user");
  router.replace({ path: "login" });
};
</script>

<template>
  <header class="w-full h-full print:hidden sticky top-0">
    <div
      class="w-full h-full flex items-center py-3 px-2 bg-white justify-between"
    >
      <div class="text-black flex items-center justify-center gap-2"></div>
      <div class="flex items-center gap-2">
        <button
          style="font-size: 0.9rem; color: #666; padding: 0 20px"
          @click="logout"
        >
          退出
        </button>
      </div>
    </div>
  </header>
</template>
