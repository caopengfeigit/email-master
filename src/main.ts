import { createApp, type DirectiveBinding } from "vue";
import { useMotion } from "@vueuse/motion";
import router from "./router";
import App from "./App.vue";
import "./assets/main.css";
import { i18n } from "./i18n";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css"; // 引入样式
import { store } from "./store"; // 引入自定义 store

const initiVueApp = () => {
  const app = createApp(App);

  // 注册全局自定义指令
  app.directive("fade", {
    mounted: (el: HTMLElement, bin: DirectiveBinding) => {
      useMotion(el, {
        initial: {
          opacity: 0,
        },
        enter: {
          opacity: 1,
          transition: {
            delay: (bin.value + 1) * 30,
          },
        },
      });
    },
  });

  // 将 store 注入为全局属性
  app.config.globalProperties.$store = store;

  // 注册插件
  app.use(router).use(i18n).use(ElementPlus).mount("#app");
};

initiVueApp();
