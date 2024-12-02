import { reactive } from "vue";
import mitt from "mitt";

type Events = {
  updateMenuGroupItemCount: { gid: number; status: number; count: number };
};
export const EventBus = mitt<Events>();
const locale = localStorage.getItem("locale");
const currentLocale = locale
  ? JSON.parse(locale)
  : {
      key: "zh",
      text: "Chinese",
    };

const userVal = localStorage.getItem("user");
const user = userVal ? JSON.parse(userVal) : null;

interface MenuGroup {
  status: number;
  items: any[];
}

const DEFAULT_STORE = {
  // related to modals
  name: "",
  show: false,
  row: null,
  // i18n
  currentLocale,
  // auth
  user,
  // email list
  selectedMails: [] as any[], // 初始化邮件列表
  mailData: {} as Record<string, any[]>, // 邮件数据
  // 新增部分：菜单组和选中的菜单组
  menuGroups: [
    { status: 0, items: [] as any[] },
    { status: 1, items: [] as any[] },
    { status: 2, items: [] as any[] },
    { status: 3, items: [] as any[] },
  ] as MenuGroup[],
  selectedMenuGroup: 0, // 默认选择未检测
  selectedGid: 0, // 默认组id
};

// 类型定义
interface StoreState {
  show: boolean;
  name: string;
  currentLocale: { key: string; text: string };
  user: any;
  selectedMails: any[];
  mailData: Record<string, any[]>;
  menuGroups: { status: number; items: any[] }[]; // 新增菜单组
  selectedMenuGroup: number; // 当前选中的菜单组
  selectedGid: number; // 组id
}

export const store: any = {
  state: reactive<StoreState>(DEFAULT_STORE),

  // Getters
  getters: {
    getModalVisibility: () => store.state.show,
    getModalName: () => store.state.name,
    getCurrentLocale: () => store.state.currentLocale,
    getUser: () => store.state.user,
    getSelectedMails: () => store.state.selectedMails,
    getMailData: () => store.state.mailData,
    getSelectedMenuGroupStatus: () => store.state.selectedMenuGroup,
    getSelectedGid: () => store.state.selectedGid,
    getContextMenuItemsForStatus: () => {
      switch (store.state.selectedMenuGroup) {
        case 0: // 未检测
          return [
            { label: "登录邮箱", action: "login" },
          ];
        case 1: // 连接失败
          return [
            { label: "登录邮箱", action: "login" },
          ];
        case 2: // 登录失败
          return [
            { label: "登录邮箱", action: "login" },
          ];
        case 3: // 登录成功
          return [
            { label: "接收邮件", action: "getMails" },
          ];
        default:
          return [];
      }
      return [];
    }
  },

  // Setters
  setters: {
    updateStore({ key, value }: { key: keyof StoreState; value: any }) {
      if (key === "currentLocale") {
        localStorage.setItem("locale", JSON.stringify(value));
      }
      if (key === "user") {
        localStorage.setItem("user", JSON.stringify(value)); // 更新 user 到 localStorage
      }
      store.state[key] = value; // 更新 state
    },
    updateSelectedMails(mails: any[]) {
      store.state.selectedMails = [...mails]; // 替换引用，触发响应式
      store.state.selectedMails = [...store.state.selectedMails]; // 替换引用，触发响应式
    },
    updateMailData(mailData: Record<string, any[]>) {
      store.state.mailData = { ...store.state.mailData, ...mailData }; // 合并新的邮件数据
    },
    // 更新选中的菜单组
    updateSelectedMenuGroup(status: number) {
      store.state.selectedMenuGroup = status;
    },
    // 更新选中的组id
    updateSelectedGid(id: number) {
      store.state.selectedGid = id;
    }
  },

  // Dispatch（模拟 Vuex 的 actions）
  dispatch(action: string, payload: any) {
    switch (action) {
      case "updateSelectedMails":
        this.setters.updateSelectedMails(payload);
        break;
      case "updateMailData":
        this.setters.updateMailData(payload);
        break;
      case "updateSelectedMenuGroup":
        this.setters.updateSelectedMenuGroup(payload);
        break;
      case "updateSelectedGid":
        this.setters.updateSelectedGid(payload);
        break;
      default:
        console.error(`Action "${action}" 未定义`);
    }
  },
};

interface args1 {
  key: "show";
  value: boolean;
}

interface args2 {
  key: "name";
  value:
    | "TranslationModal"
    | "ProductUpdate"
    | "ProductDelete"
    | "ProductCreate"
    | "InvoiceCreate"
    | "InvoiceUpdate"
    | "InvoiceDelete"
    | "SupplierCreate"
    | "SupplierDelete"
    | "SupplierUpdate"
    | "ClientDelete"
    | "ClientUpdate"
    | "ClientCreate"
    | "OrderCreate"
    | "OrderDelete"
    | "OrderUpdate"
    | "CsvUploader"
    | string;
}

interface args4 {
  key: "currentLocale";
  value: locale;
}

interface args5 {
  key: "user";
  value: any;
}

export type Args = args1 | args2 | args4 | args5;

export interface storeState
  extends Record<"currentLocale", locale>,
    Record<"show", boolean>,
    Record<"name", string>,
    Record<"user", any>,
    Record<"selectedMails", any[]> {} // 添加 selectedMails 类型

export interface locale {
  key: string;
  text: string;
}
