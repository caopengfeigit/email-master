<script setup lang="ts">
import { useUpdateRouteQueryParams } from "@/composables/useUpdateQuery";
import { store } from "@/store";
import type { Res } from "@/types";
import { invoke } from "@tauri-apps/api";
import { error, info } from "tauri-plugin-log-api";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import UiModalCard from "./ui/UiModalCard.vue";
import UiUploader from "./ui/UiUploader.vue";
import { Button } from "./ui/button";
import { ref } from "vue";

const { t } = useI18n();
const { updateQueryParams } = useUpdateRouteQueryParams();

const excelPath = ref<string>();

const isCreating = ref<boolean>(false);

const createNewClientsFromExcel = async () => {
  isCreating.value = true;
  try {
    const fileBytes = await getFileBytes(excelPath.value!);
    await invoke<Res<null>>("import_clients_from_excel", {
      file: fileBytes,
    });
    //
    info(`IMPORT CLIENTS FROM EXCEL: ${excelPath.value}`);
    //
    toast.success(t("notifications.client.imported"), {
      closeButton: true,
    });
    // toggle refresh
    updateQueryParams({
      refresh: "refresh-import-" + Math.random() * 9999,
    });
  } catch (err: any) {
    error("IMPORT CLIENTS FROM EXCEL: " + err);
  } finally {
    isCreating.value = false;
    hideModal();
  }
};

const hideModal = () => {
  store.setters.updateStore({ key: "show", value: false });
};

const setExcelFile = (file: string) => {
  excelPath.value = file;
};
</script>

<template>
  <UiModalCard>
    <template #title>
      {{ t("c.c.title") }}
    </template>
    <template #content>
      <form
        class="h-full w-full flex flex-col gap-2"
        @submit.prevent="createNewClientsFromExcel"
      >
        <UiUploader
          name="Excel File"
          :extensions="['xlsx', 'xls']"
          @save="setExcelFile"
        />
        <div class="w-full grid grid-cols-3 gap-2">
          <Button
            @click="hideModal"
            type="button"
            :disabled="isCreating"
            variant="outline"
          >
            {{ t("g.b.no") }}</Button
          >
          <Button
            :disabled="isCreating"
            type="submit"
            class="w-full col-span-2"
          >
            {{ t("g.b.c") }}
          </Button>
        </div>
      </form>
    </template>
  </UiModalCard>
</template>
