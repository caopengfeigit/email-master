<script setup lang="ts">
import { useUpdateRouteQueryParams } from "@/composables/useUpdateQuery";
import ClientsTable from "@/components/ClientsTable.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { invoke } from "@tauri-apps/api";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { store } from "@/store";
import {
  type WatchStopHandle,
  onUnmounted,
  onMounted,
  computed,
  provide,
  watch,
  ref,
} from "vue";
import type { ClientT } from "@/schemas/client.schema";
import { error } from "tauri-plugin-log-api";
import type { Res } from "@/types";
import { PlusCircleIcon } from "lucide-vue-next";

const { t } = useI18n();
const route = useRoute();
const { updateQueryParams } = useUpdateRouteQueryParams();

const clients = ref<ClientT[]>([]);
const searchQuery = ref<string>("");
const groupFilter = ref<string | null>(null); // Added filter for group selection
const page = computed(() => Number(route.query.page));
const refresh = computed(() => route.query.refresh);

const totalRows = ref<number>(0);

provide("count", totalRows);
provide("itemsCount", 17);

//
let timer: any;
let unwatch: WatchStopHandle | null = null;
onMounted(() => {
  unwatch = watch(
    [searchQuery, groupFilter, page, refresh],
    ([search, group, p], [oldSearch]) => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          if (p && p > 0) getClients(search, group, p);
        },
        search != oldSearch && oldSearch ? 500 : 0
      );
    },
    {
      immediate: true,
    }
  );
});

onUnmounted(() => {
  if (unwatch) unwatch();
});

const getClients = async (
  search: string,
  group: string | null,
  page: number = 1
) => {
  try {
    const res = await invoke<Res<any>>("list_clients", {
      args: {
        search,
        group,
        page,
        limit: 17,
      },
    });
    clients.value = res.data.clients;
    totalRows.value = res.data.count;
  } catch (err: any) {
    error("LIST CLIENTS " + err);
  }
};

const uploadCSV = () => {
  store.setters.updateStore({ key: "name", value: "CsvUploader" });
  store.setters.updateStore({ key: "show", value: true });
  updateQueryParams({ table: "clients" });
};

const updateModal = (name: string) => {
  store.setters.updateStore({ key: "show", value: true });
  store.setters.updateStore({ key: "name", value: name });
};
</script>

<template>
  <main class="w-full h-full">
    <div class="w-full h-full flex flex-col items-start justify-start">
      <div class="flex justify-between w-full gap-9 mb-2">
        <div class="w-2/3 lg:max-w-[50%] flex gap-2">
          <Input v-model="searchQuery" type="text" :placeHolder="t('g.s')" />
          <Select v-model="groupFilter">
            <SelectTrigger>
              <SelectValue
                class="text-muted-foreground"
                :placeholder="t('分组')"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="w-fit flex gap-2">
          <Button
            class="gap-2 text-nowrap"
            @click="updateModal('ClientCreate')"
          >
            <PlusCircleIcon :size="20" />
            {{ t("c.i.addButton") }}
          </Button>
        </div>
      </div>
      <ClientsTable :clients="clients" />
    </div>
  </main>
</template>
