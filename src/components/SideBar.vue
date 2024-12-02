<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { store, EventBus } from "@/store";
import { sendApiRequest } from "@/api"; // 引入封装好的 API 请求插件
import { cn } from "@/utils/shadcn";
import {
  ChevronsLeft,
  Contact,
  Store,
  Languages,
  Package,
} from "lucide-vue-next";
import {
  ElMessageBox,
  ElMessage,
  ElDialog,
  ElInput,
  ElButton,
  ElUpload,
} from "element-plus";
import { useRoute } from "vue-router";

const route = useRoute();
const collapse = defineModel<boolean>("collapse", { required: true });
const { t } = useI18n();

const locale = computed(() => store.getters.getCurrentLocale());

const openTranslationModal = () => {
  store.setters.updateStore({ key: "show", value: true });
  store.setters.updateStore({ key: "name", value: "TranslationModal" });
};
const emit = defineEmits(["updateMailList", "updateSelectedMenuGroup", "updateSelectedGid"]);

// 存储菜单数据
const menuGroups = reactive<Array<any>>([]);

// 请求接口获取菜单数据
const fetchMenuGroups = async () => {
  try {
    const response: any = await sendApiRequest(
      "GET",
      "ems/group/get-groups",
      {}
    );
    if (response && response.data) {
      menuGroups.splice(0, menuGroups.length);
      response.data.list.forEach((group: any) => {
        menuGroups.push({
          title: group.name,
          expanded: true,
          id: group.id,
          items: [
            { label: "未检测", count: 0, status: 0, selected: false },
            { label: "连接失败", count: 0, status: 1, selected: false },
            { label: "登录失败", count: 0, status: 2, selected: false },
            { label: "登录成功", count: 0, status: 3, selected: false },
          ],
        });
      });
    } else {
      ElMessage.error("加载组数据失败");
    }
    // 遍历 menuGroups，更新每个组的邮箱状态计数
    for (const group of menuGroups) {
      await getMailboxCounts(group);
    }
  } catch (error) {
    console.error("请求菜单数据失败", error);
    ElMessage.error("请求菜单数据失败");
  }
};

onMounted(() => {
  if (store.getters.getUser()) {
    // 用户已登录时才调用
    fetchMenuGroups();
  }
  // 全局点击监听，用于关闭右键菜单
  window.addEventListener("click", handleGlobalClick);
  // 监听更新菜单邮箱数
  EventBus.on("updateMenuGroupItemCount", updateMenuGroupItemCount);
});

onBeforeUnmount(() => {
  // 移除全局点击监听
  window.removeEventListener("click", handleGlobalClick);
});

// 监听路由变化，确保每次进入都执行逻辑
watch(
  () => route.fullPath,
  (newPath, oldPath) => {
    if (store.getters.getUser() && newPath === "/") {
      fetchMenuGroups(); // 再次加载数据
    }
  }
);

// 处理菜单邮箱数
const updateMenuGroupItemCount = (payload: { gid: number; status: number; count: number }) => {
  const group = menuGroups.find((g) => g.id === payload.gid);
  if (group) {
    const item = group.items.find((i) => i.status === payload.status);
    if (item) {
      item.count += payload.count;
    }
  }
}

// 全局点击处理函数
const handleGlobalClick = (event: MouseEvent) => {
  // 如果点击的目标不是右键菜单内元素，则隐藏右键菜单
  const target = event.target as HTMLElement;
  const contextMenuElement = document.querySelector(".context-menu");
  contextMenu.value.show = false;
};

// 清除邮箱
const clearMailboxes = async (gid: string) => {
  try {
    await sendApiRequest("POST", "ems/mailbox/clear-mailboxes", { gid });
    ElMessage.success("清除成功");
    await fetchMenuGroups(); // 重新获取数据
  } catch (error) {
    console.error("清除邮箱失败:", error);
    ElMessage.error("清除邮箱失败");
  }
};

// 删除邮箱
const deleteMailbox = async (gid: string) => {
  try {
    await sendApiRequest("POST", "ems/mailbox/delete-mailbox", { gid });
    ElMessage.success("删除成功");
    await fetchMenuGroups(); // 重新获取数据
  } catch (error) {
    console.error("删除邮箱失败:", error);
    ElMessage.error("删除邮箱失败");
  }
};

// 导入邮箱弹窗和操作
const importDialogVisible = ref(false);
const importType = ref<"file" | "text">("file");
const file = ref<File | null>(null);
const textContent = ref<string>("");
const selectedGid = ref<string>("");
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  groupIndex: null,
});

// 文件上传回调
const handleFileChange = (uploadFile: { raw: File }) => {
  file.value = uploadFile.raw;
};

const handleImport = async () => {
  if (!selectedGid.value) {
    ElMessage.error("未选择组 ID");
    return;
  }

  try {
    if (importType.value === "file" && file.value) {
      const formData = new FormData();
      formData.append("gid", selectedGid.value);
      formData.append("file", file.value);
      await sendApiRequest(
        "POST",
        "ems/upload/upload-mailbox-by-file",
        formData
      );
      ElMessage.success("文件上传成功");
    } else if (importType.value === "text" && textContent.value.trim()) {
      await sendApiRequest("POST", "ems/upload/upload-mailbox-by-text", {
        gid: selectedGid.value,
        content: textContent.value,
      });
      ElMessage.success("文本上传成功");
    } else {
      ElMessage.error("请提供有效的文件或文本内容");
      return;
    }
    importDialogVisible.value = false;
    await fetchMenuGroups(); // 重新获取数据
  } catch (error) {
    console.error("导入邮箱失败:", error);
    ElMessage.error("导入邮箱失败");
  }
};

// 弹窗和操作状态
const addDialogVisible = ref(false);
const newGroupName = ref("");

// 添加组
const addGroup = async () => {
  if (newGroupName.value.trim()) {
    try {
      await sendApiRequest("POST", "ems/group/add-group", {
        name: newGroupName.value.trim(),
      });
      ElMessage.success("组添加成功");
      newGroupName.value = "";
      addDialogVisible.value = false;
      await fetchMenuGroups(); // 重新获取数据
    } catch (error) {
      console.error("添加组失败:", error);
      ElMessage.error("添加组失败");
    }
  } else {
    ElMessage.error("请输入组名称");
  }
};

const toggleGroup = (group: any) => {
  group.expanded = !group.expanded;
};

const handleContextMenu = (
  event: { preventDefault: () => void; clientX: any; clientY: any },
  index: any
) => {
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    groupIndex: index,
  };
};

const handleViewMailboxes = async (group: any, item: any ) => {
  if (!group.id) {
    ElMessage.error("组 ID 不存在");
    return;
  }

  try {
    // 设置选中状态
    menuGroups.forEach((g) => {
      g.items.forEach((i: any) => {
        i.selected = false; // 清除所有状态的选中效果
      });
    });
    item.selected = true; // 设置当前状态为选中

    emit("updateSelectedMenuGroup", item.status); // 将数据传递给父组件
    emit("updateSelectedGid", group.id);

    // 调用 HTTP 接口获取邮箱数据
    const response: any = await sendApiRequest(
      "GET",
      "ems/mailbox/get-all-mailboxes",
      {
        gid: group.id, // 使用 group 的 id 作为参数
        status: item.status,
      }
    );

    // 假设接口返回的邮箱数据在 response.data
    const emailData = response.data.list;
    item.count = response.data.count
    if (emailData) {
      emit("updateMailList", emailData); // 将数据传递给父组件
    } else {
      ElMessage.error("未获取到邮箱数据");
    }

    // 调用第二个接口获取状态计数
    await getMailboxCounts(group);
  } catch (error) {
    ElMessage.error("获取邮箱数据失败");
  }
};

// 更新邮箱状态计数的方法
const getMailboxCounts = async (group: any) => {
  try {
    const countResponse: any = await sendApiRequest(
      "GET",
      "ems/mailbox/get-mailbox-count",
      { gid: group.id }
    );

    if (countResponse && countResponse.data) {
      const countData = countResponse.data;

      // 更新 group.items 的 count
      group.items.forEach((i: any) => {
        switch (i.status) {
          case 0:
            i.count = countData.un_checked || 0;
            break;
          case 1:
            i.count = countData.un_linked || 0;
            break;
          case 2:
            i.count = countData.login_failed || 0;
            break;
          case 3:
            i.count = countData.login_success || 0;
            break;
          default:
            i.count = 0;
        }
      });
    } else {
      ElMessage.error("未获取到邮箱计数数据");
    }
  } catch (error) {
    ElMessage.error("获取邮箱状态计数失败");
  }
};
</script>

<template>
  <aside class="w-full h-screen sticky top-0 z-50 flex flex-col gap-3 bg-white">
    <div class="w-full min-h-[51px] border-b border-slate-100">
      <div
        :class="
          cn(
            'font-medium flex h-full items-center px-1',
            collapse ? 'justify-around' : 'justify-between'
          )
        "
      >
        <span
          v-if="!collapse"
          class="whitespace-nowrap flex items-center gap-2 pl-2 font-semibold text-base text-primary overflow-hidden"
        >
          <Store :size="20" class="text-primary inline shrink-0 m-auto" />
          Email大师
        </span>
        <ChevronsLeft
          @click="collapse = !collapse"
          :size="20"
          :class="{
            'rotate-180': collapse,
            'transition-all duration-200 cursor-pointer transform': true,
          }"
        />
      </div>
    </div>

    <!-- 新增按钮 -->
    <div v-if="!collapse" class="p-2">
      <ElButton
        type="primary"
        :style="'background: hsl(var(--primary)); border: hsl(var(--primary)) text-sm'"
        @click="addDialogVisible = true"
        class="w-full"
      >
        新增组
      </ElButton>
    </div>

    <div class="w-full px-1 flex flex-col justify-around h-full pb-2">
      <div class="w-full h-full flex flex-col gap-1">
        <!-- 遍历菜单组 -->
        <div
          v-for="(group, index) in menuGroups"
          :key="index"
          @contextmenu="handleContextMenu($event, index)"
        >
          <div
            @click="toggleGroup(group)"
            class="flex items-center cursor-pointer p-1 group transition-all duration-300"
          >
            <span class="w-[30px] shrink-0">
              <Contact
                class="m-auto text-gray-700 group-hover:text-black"
                :size="18"
              />
            </span>
            <span
              v-if="!collapse"
              :title="`${group.title} (${group.items.reduce(
                (total, item) => total + item.count,
                0
              )})`"
              class="text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis ml-1 text-xs group-hover:text-primary font-medium"
              style="max-width: 180px"
            >
              {{ group.title }}
            </span>
            <ChevronsLeft
              :size="16"
              :class="{
                'rotate-180': group.expanded,
                'transition-transform duration-200': true,
              }"
            />
          </div>

          <!-- 分组内容 -->
          <div v-show="group.expanded && !collapse" class="flex flex-col pl-8">
            <div
              v-for="(item, subIndex) in group.items"
              :key="subIndex"
              class="flex items-center p-1 group cursor-pointer transition-all duration-300"
              :class="{
                'bg-gray-200 text-gray-800': item.selected, // 选中状态为浅灰背景 + 深灰文字
                'hover:bg-gray-100': !item.selected,        // 非选中状态的悬停效果
              }"
              @click="handleViewMailboxes(group, item)"
            >
              <span class="w-[24px] shrink-0">
                <Package
                  :class="{
                    'text-gray-800': item.selected,             // 选中状态图标颜色
                    'text-gray-700 group-hover:text-gray-900': !item.selected, // 非选中状态
                  }"
                  class="m-auto"
                  :size="16"
                />
              </span>
              <span
                class="text-gray-500 text-nowrap overflow-hidden ml-1 text-xs font-medium"
                :class="{
                  'text-gray-800': item.selected,             // 选中状态的文字颜色
                  'group-hover:text-gray-900': !item.selected, // 悬停状态
                }"
              >
                {{ item.label }} ({{ item.count }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        class="cursor-pointer w-full flex h-9 rounded-md items-center p-1 group transition-all duration-300"
        @click="openTranslationModal"
      >
        <span class="w-[24px] shrink-0">
          <Languages
            class="m-auto text-gray-700 group-hover:text-black"
            :size="18"
          />
        </span>
        <span
          v-if="!collapse"
          class="text-gray-500 text-nowrap overflow-hidden ml-1 text-xs group-hover:text-primary font-medium"
        >
          {{ locale.text }}
        </span>
      </div>
    </div>

    <!-- 新增组弹窗 -->
    <ElDialog title="新增组" v-model="addDialogVisible">
      <ElInput v-model="newGroupName" placeholder="输入组名称" />
      <template #footer>
        <ElButton @click="addDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="addGroup">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 导入邮箱弹窗 -->
    <ElDialog title="导入邮箱" v-model="importDialogVisible">
      <div>
        <ElButton
          type="primary"
          @click="importType = 'file'"
          :plain="importType !== 'file'"
        >
          文件导入
        </ElButton>
        <ElButton
          type="primary"
          @click="importType = 'text'"
          :plain="importType !== 'text'"
        >
          文本导入
        </ElButton>
      </div>
      <div v-if="importType === 'file'" class="mt-4">
        <ElUpload
          action=""
          :auto-upload="false"
          @onChange="handleFileChange"
          :show-file-list="false"
        >
          <ElButton type="primary">选择文件</ElButton>
        </ElUpload>
      </div>
      <div v-else class="mt-4">
        <ElInput
          type="textarea"
          v-model="textContent"
          placeholder="请输入邮箱内容"
        />
      </div>
      <template #footer>
        <ElButton @click="importDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleImport">导入</ElButton>
      </template>
    </ElDialog>

    <!-- 右键菜单 -->
    <div
  v-if="contextMenu.show"
  :style="{
    top: `${contextMenu.y}px`,
    left: `${contextMenu.x}px`,
    width: '120px',
  }"
  class="absolute z-50 bg-white shadow-lg border border-gray-200 p-2 rounded-md"
>
  <button
    @click="
      importDialogVisible = true;
      selectedGid = menuGroups[contextMenu.groupIndex].id;
    "
    class="text-blue-400 text-sm w-full hover:text-blue-500 text-left border-b border-gray-300 pb-1"
  >
    导入邮箱
  </button>
  <button
    @click="clearMailboxes(menuGroups[contextMenu.groupIndex].id)"
    class="text-red-400 text-sm w-full hover:text-red-500 text-left border-b border-gray-300 mt-1 pb-1"
  >
    清除组所有邮箱
  </button>
  <button
    @click="deleteMailbox(menuGroups[contextMenu.groupIndex].id)"
    class="text-red-400 text-sm w-full hover:text-red-500 text-left mt-1"
  >
    删除组
  </button>
</div>
  </aside>
</template>

<style scoped>
.text-xs {
  font-size: 12px;
}
</style>
