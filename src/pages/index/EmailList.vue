<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useVirtualList } from "@vueuse/core";
import { store } from "@/store";
import { socketManager } from "@/socketApi";
import { ElMessage } from "element-plus";
import { changeMailboxStatusTxt } from "@/log";

interface Email {
  id: number;
  email: string;
  gid: number;
  password: string;
  provicer: string;
  status: number;
  mail_count: number;
  receive_at: string;
  new_count: number;
  option: string;
}

const lastSelectedIndex = ref<number | null>(null); // 最近选中的索引
// 响应式数据绑定到 `useVirtualList`
const emailList = ref<Email[]>([]);
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  email: null,
});

// 右键菜单操作
const handleAction = (action: string) => {
  if (!contextMenu.value.email) return;

  if (selectedEmails.value.length == 0) {
    ElMessage.error("请选择邮箱");
    contextMenu.value.show = false;
    return
  }

  switch (action) {
    case "login":
      wsHandler("login");
      break;
    case "getMails":
      wsHandler("inboxMails");
      break;
    default:
      break;
  }

  // 关闭菜单
  contextMenu.value.show = false;
};

watch(
  () => store.state.selectedMails,
  (newVal) => {
    if (emailList.value !== newVal) {
      emailList.value = newVal;
    }
  },
  { immediate: true }
);

const { list, containerProps, wrapperProps } = useVirtualList(emailList, {
  itemHeight: 30,
  overscan: 10,
});

const selectedEmails = ref<number[]>([]);

// 鼠标拖拽相关逻辑
const isDragging = ref(false);
const selectionBox = ref({ x: 0, y: 0, width: 0, height: 0 });
const startPoint = ref({ x: 0, y: 0 });

const handleMouseDown = (event: MouseEvent) => {
  // 如果是右键菜单中点击，不清空已选择数据
  const isContextMenuClick = contextMenu.value.show && event.button === 0; // 左键点击菜单项
  if (!isContextMenuClick) {
    isDragging.value = true;
    startPoint.value = { x: event.clientX, y: event.clientY };
    selectionBox.value = { x: event.clientX, y: event.clientY, width: 0, height: 0 };

    // 未按下 Ctrl/Command 键时清空选中列表
    if (!event.ctrlKey && !event.metaKey && event.button !== 2) {
      selectedEmails.value = [];
      lastSelectedIndex.value = null; // 清空最近索引
    }
  }
};

const handleMouseMove = (event: MouseEvent) => {
  // 检查鼠标是否仍然按下，如果未按下则不触发拖动
  if (!isDragging.value || event.buttons !== 1) return;

  const currentPoint = { x: event.clientX, y: event.clientY };
  selectionBox.value = {
    x: Math.min(startPoint.value.x, currentPoint.x),
    y: Math.min(startPoint.value.y, currentPoint.y),
    width: Math.abs(startPoint.value.x - currentPoint.x),
    height: Math.abs(startPoint.value.y - currentPoint.y),
  };

  // 更新选中的邮箱
  updateSelectedEmails();
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleClick = (emailId: number, event: MouseEvent) => {
  const clickedIndex = emailList.value.findIndex((email) => email.id === emailId);

  if (event.shiftKey && lastSelectedIndex.value !== null) {
    const [startIndex, endIndex] = [lastSelectedIndex.value, clickedIndex].sort((a, b) => a - b);
    selectedEmails.value = Array.from(
      new Set([...selectedEmails.value, ...emailList.value.slice(startIndex, endIndex + 1).map((e) => e.id)])
    );
  } else if (event.ctrlKey || event.metaKey) {
    const selectedSet = new Set(selectedEmails.value);
    selectedSet.has(emailId) ? selectedSet.delete(emailId) : selectedSet.add(emailId);
    selectedEmails.value = Array.from(selectedSet);
  } else {
    selectedEmails.value = [emailId];
  }

  lastSelectedIndex.value = clickedIndex;
};

// 根据选区范围检测选中的邮箱条目
const updateSelectedEmails = () => {
  const box = selectionBox.value;

  // 仅获取当前渲染区域的 DOM 节点，提升性能
  const visibleEmails = document.querySelectorAll("[id^='email-']");

  const intersectingIds = Array.from(visibleEmails)
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left < box.x + box.width &&
        rect.right > box.x &&
        rect.top < box.y + box.height &&
        rect.bottom > box.y
      );
    })
    .map((element) => Number(element.id.split("-")[1]));

  selectedEmails.value = Array.from(new Set([...selectedEmails.value, ...intersectingIds]));
};

// 右键菜单操作
const getMenuPosition = (event: MouseEvent) => {
  const { clientX: x, clientY: y } = event;
  const menuElement = document.querySelector('.context-menu') as HTMLElement;

  if (!menuElement) return { x, y };

  const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuElement;
  const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;

  return {
    x: Math.min(x, viewportWidth - menuWidth),
    y: Math.min(y, viewportHeight - menuHeight),
  };
};

const handleContextMenu = (event: MouseEvent, email: Email) => {
  event.preventDefault();
  const { x, y } = getMenuPosition(event);

  contextMenu.value = {
    show: true,
    x,
    y,
    email,
  };
};

const wsHandler = async (type: "login" | "inboxMails") => {
  const data = {
    type,
    data: {
      gid: store.getters.getSelectedGid(),
      status_id: store.getters.getSelectedMenuGroupStatus(),
      ids: selectedEmails.value.join(","),
    },
  };

  try {
    socketManager.sendMessage(data); // 假设通过 WebSocket 获取数据
    changeMailboxStatusTxt({type: type, event: "send", ids: selectedEmails.value});
    // 将获取到的邮件数据追加到 store
    /*if (type === "inboxMails" && result?.data?.mail) {
      store.dispatch("updateMailData", [result.data.mail]); // 将新数据以数组形式追加
    }

    contextMenu.value.show = false;*/ // 关闭菜单
  } catch (error) {
    console.error("Socket action failed:", error);
  }
};

// 点击空白区域关闭菜单
const handleGlobalClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  // 检查点击是否在右键菜单外部
  if (!target.closest(".context-menu")) {
    contextMenu.value.show = false;

    // 重置拖动状态，防止意外触发拖动选择
    isDragging.value = false;
  }
};

const addMouseEvents = () => {
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("click", handleGlobalClick);
};

const removeMouseEvents = () => {
  window.removeEventListener("mousedown", handleMouseDown);
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("click", handleGlobalClick);
};

onMounted(addMouseEvents);
onBeforeUnmount(removeMouseEvents);
</script>

<template>
  <div class="h-full-c bg-white shadow-lg rounded-lg p-4 border border-gray-200 mr-3">
    <h3 class="text-xl font-semibold text-gray-800 mb-4">邮箱列表</h3>

    <!-- 表头 -->
    <div
      class="header-row sticky top-0 z-10 grid grid-cols-6 gap-4 bg-gray-100 p-3 text-sm"
    >
      <div class="font-semibold">序号</div>
      <div class="font-semibold">邮箱</div>
      <div class="text-center font-semibold">邮件数</div>
      <div class="text-center font-semibold">新邮件</div>
      <div class="font-semibold">最后接收</div>
      <div class="font-semibold">状态</div>
    </div>

    <!-- 邮箱列表 -->
    <div
      v-bind="containerProps"
      class="overflow-y-auto relative"
      style="height: calc(100vh - 200px)"
    >
      <div v-bind="wrapperProps">
        <!-- 如果列表为空 -->
        <div v-if="!list.length" class="text-center text-gray-500 py-10">
          暂无数据
        </div>

        <!-- 如果列表不为空 -->
        <div
          v-else
          v-for="(item, index) in list"
          :key="item.data.id"
          :id="`email-${item.data.id}`"
          class="grid grid-cols-6 gap-4 items-center p-2 cursor-pointer border-b border-gray-200 transition-all duration-200 text-xs"
          @contextmenu="handleContextMenu($event, item.data)"
          @click="handleClick(item.data.id, $event)"
          :class="{ 'bg-blue-100': selectedEmails.includes(item.data.id) }"
        >
          <div class="truncate">
            <span
              :class="[
                'inline-block w-3 h-3 rounded-full',
                item.data.status === 3 ? 'bg-green-500' : 'bg-red-500',
              ]"
            ></span>
            {{ index+1 }}
          </div>
          <div class="truncate">{{ item.data.email }}</div>
          <div class="text-center">{{ item.data.mail_count }}</div>
          <div class="text-center">{{ item.data.new_count ?? 0 }}</div>
          <div class="truncate">{{ item.data.receive_at }}</div>
          <div class="truncate" :style="{ color: '#E65100' }">{{ item.data.option ?? '无' }}</div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      :style="{
        top: `${contextMenu.y - 60}px`,
        left: `${contextMenu.x - 230}px`,
      }"
      class="context-menu absolute z-50 bg-white shadow-lg border border-gray-200 p-2 rounded-md"
    >
      <!-- 动态渲染菜单项 -->
      <div
        v-for="(item, index) in store.getters.getContextMenuItemsForStatus()"
        :key="item.action"
        class="menu-item block w-full text-left text-blue-400 text-sm p-1 hover:text-blue-500"
        :class="{
          'border-b border-gray-300': store.getters.getContextMenuItemsForStatus().length > 1 && index < store.getters.getContextMenuItemsForStatus().length - 1
        }"
        @click="handleAction(item.action)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  min-width: 150px;
}

.menu-item {
  cursor: pointer;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: #6b7280; /* Tailwind 灰色 */
}

.pointer-events-none {
  pointer-events: none;
}
</style>