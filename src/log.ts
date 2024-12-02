import { store } from "@/store";
import { ref, nextTick } from "vue";

// 定义日志项的类型
interface LogItem {
    id: number; // 唯一标识符
    time: string;
    message: string;
    type: "info" | "warning" | "error"; // 日志类型
}

// 初始日志数据
export const logs = ref<LogItem[]>([]);

// 添加日志的函数
export const optionLog = (message: string, type: "info" | "warning" | "error" = "info") => {
    const newTime = new Date().toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
    logs.value.push({
        id: Date.now(),
        time: newTime,
        message: message,
        type,
    });

    // 限制日志条目数量
    if (logs.value.length > 500) {
        logs.value.shift();
    }
};

export const changeMailboxStatusTxt = (data: any) => {
    switch (data.type) {
        case "login":
            switch (data.event) {
                case "send":
                    for (const id of data.ids) {
                        const mb = store.getters.getSelectedMails().find(item => item.id === id);
                        if (mb) {
                            mb.option = "登录中......";
                        }
                    }
                    break;
                case "receiveError":
                    const mb = store.getters.getSelectedMails().find(item => item.id === data.id);
                    if (mb) {
                        mb.option = data.message;
                    }
                    break;
            }
            break;
        case "useProxy":
            const mb = store.getters.getSelectedMails().find(item => item.id === data.id);
            if (mb) {
                mb.option = data.message;
            }
            break;
    }
}