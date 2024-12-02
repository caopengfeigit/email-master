import { ref } from "vue";
import { invoke } from "@tauri-apps/api/tauri";
import { ElMessage } from "element-plus";
import { store, EventBus } from "@/store";
import { changeMailboxStatusTxt, optionLog } from "@/log";

class WebSocketManager {
  private url: string = "ws://127.0.0.1:8183/ws";
  private socket: WebSocket | null = null;
  private messageHandlers: Record<string, (message: any) => void> = {};
  private heartbeatInterval: any;
  private reconnectTimeout: any;
  private token: string = "";
  private connectErrCodes = [400002, 400003, 400004, 400006];
  private loginErrCodes = [400005];

  // WebSocket 连接状态
  isConnected = ref(false);

  // 初始化 WebSocket 连接
  async connect(interval: number = 50000) {
    if (this.isConnected.value) {
      await this.logToRust("info", "WebSocket is already connected.");
      return;
    }

    const userVal = localStorage.getItem("user");
    const user = userVal ? JSON.parse(userVal) : null;
    this.token = user?.token || "";

    if (!this.token) {
      await this.logToRust("error", "Token not found in localStorage");
      return;
    }

    await this.logToRust("info", `Connecting with token: ${this.token}`);
    await this.logToRust("info", `WebSocket URL: ${this.url}`);

    // 创建 WebSocket 连接
    this.socket = new WebSocket(
      `${this.url}?token=${encodeURIComponent(this.token)}`
    );

    // 监听连接打开事件
    this.socket.onopen = async () => {
      await this.logToRust("info", "WebSocket connection established.");
      this.isConnected.value = true;

      // 发送初始心跳消息，包含 token 以进行认证
      const heartbeatMessage = { type: "heartbeat", token: this.token };
      this.sendMessage(heartbeatMessage);

      // 设置应用层面的心跳间隔
      this.startHeartbeat("heartbeat", interval);
    };

    // 监听消息事件
    this.socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
    
        // 继续后续操作
        await this.logToRust(
          "info",
          `Received message: ${JSON.stringify(message)}`
        );
        
        this.handlerWsMsg(message);
    
      } catch (error) {
        // 捕获并打印 JSON.parse 错误
        console.error("Failed to parse JSON:", event.data);
        console.error(error);
      }
    };

    // 监听连接关闭事件
    this.socket.onclose = async () => {
      await this.logToRust("info", "WebSocket connection closed.");
      this.isConnected.value = false;
      this.socket = null;

      // 清除心跳定时器
      this.stopHeartbeat();

      // 尝试重新连接
      this.reconnect();
    };

    // 监听错误事件
    this.socket.onerror = async (error) => {
      await this.logToRust(
        "error",
        `WebSocket error: ${JSON.stringify(error)}`
      );
    };
  }

  // 开始发送心跳消息
  startHeartbeat(messageType: string, interval: number) {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected.value && this.socket) {
        const heartbeatMessage = { type: messageType, token: this.token };
        this.sendMessage(heartbeatMessage);
      }
    }, interval);
  }

  // 停止心跳消息
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  // 重连 WebSocket
  reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.logToRust("info", "Reconnecting WebSocket...");
      this.connect();
    }, 5000); // 每 5 秒尝试重连一次
  }

  // 发送消息，接受动态参数
  sendMessage(message: { type: string; data?: any }) {
    if (!this.isConnected.value || !this.socket) {
      this.logToRust(
        "error",
        "Cannot send message, WebSocket is not connected."
      );
      return;
    }

    const messageString = JSON.stringify(message);
    this.logToRust("info", `Sending message: ${messageString}`);
    this.socket.send(messageString);
  }

  // 注册消息类型的处理函数
  on(type: string, handler: (data: any) => void) {
    this.messageHandlers[type] = handler;
  }

  // 关闭 WebSocket 连接
  close() {
    if (this.socket) {
      this.logToRust("info", "Closing WebSocket connection...");
      this.socket.close();
    }
  }

  // 日志记录到 Rust
  async logToRust(level: string, message: string) {
    try {
      await invoke("log_message", { level, message });
    } catch (error) {
      console.error("Failed to log message to Rust:", error);
    }
  }

  // 处理websocket信息返回
  handlerWsMsg(resp: { code: number; message: string; data: any }) {
    const { code, message, data } = resp;
  
    // 处理无效数据或心跳
    if (!data) {
      if (code > 0) ElMessage.error(message);
      return;
    }
  
    // 公用的状态更新方法
    const updateStatus = (gid: number, fromStatus: number, toStatus: number, emailId: number) => {
      if (
        store.getters.getSelectedMenuGroupStatus() === fromStatus &&
        store.getters.getSelectedGid() === gid && 
        toStatus != resp.data.status_id
      ) {
        store.dispatch(
          "updateSelectedMails",
          store.getters.getSelectedMails().filter((email) => email.id !== emailId)
        );
      }
      EventBus.emit("updateMenuGroupItemCount", { gid, status: fromStatus, count: -1 });
      EventBus.emit("updateMenuGroupItemCount", { gid, status: toStatus, count: 1 });
    };
  
    // 响应处理逻辑
    const handleAction = {
      login: () => {
        if (code > 0) {
          changeMailboxStatusTxt({ type: data.action_type, event: "receiveError", id: data.id, message });
          optionLog(`${data.mailbox} ${message}`, "error");
  
          let statusId = 0;
          if (this.connectErrCodes.includes(code)) statusId = 1;
          else if (this.loginErrCodes.includes(code)) statusId = 2;
  
          updateStatus(data.gid, data.status_id, statusId, data.id);
        } else {
          optionLog(`${data.mailbox} 登录成功`);
          updateStatus(data.gid, data.status_id, 3, data.id);
        }
      },
      useProxy: () => {
        let msg = `分配代理：${data.proxy_host}:${data.proxy_port}:${data.proxy_user}`
        changeMailboxStatusTxt({ type: data.action_type, id: data.id, message: msg });
        optionLog(`${data.mailbox} ${msg}`);
      },
      newMail: () => {},
      inboxMails: () => {},
      bulkMails: () => {},
      allMails: () => {},
      mailDetail: () => {},
    };
  
    // 执行对应的 action
    if (handleAction[data.action_type]) {
      handleAction[data.action_type]();
    }
  }
}

export const socketManager = new WebSocketManager();
