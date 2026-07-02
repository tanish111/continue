import { ConfigResult, ConfigValidationError } from "@continuedev/config-yaml";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrowserSerializedContinueConfig, IdeSettings } from "core";
import { DEFAULT_CONTEXT_LENGTH } from "core/llm/constants";

export type ConfigState = {
  configError: ConfigValidationError[] | undefined;
  config: BrowserSerializedContinueConfig;
  loading: boolean;
  ideSettings: IdeSettings | null;
};

export const EMPTY_CONFIG: BrowserSerializedContinueConfig = {
  slashCommands: [],
  contextProviders: [],
  tools: [],
  mcpServerStatuses: [],
  modelsByRole: {
    chat: [],
    apply: [],
    edit: [],
    summarize: [],
    autocomplete: [],
    rerank: [],
    embed: [],
    subagent: [],
  },
  selectedModelByRole: {
    chat: null,
    apply: null,
    edit: null,
    summarize: null,
    autocomplete: null,
    rerank: null,
    embed: null,
    subagent: null,
  },
  rules: [],
};

export const INITIAL_CONFIG_SLICE: ConfigState = {
  configError: undefined,
  config: EMPTY_CONFIG,
  loading: false,
  ideSettings: null,
};

export const configSlice = createSlice({
  name: "config",
  initialState: INITIAL_CONFIG_SLICE,
  reducers: {
    setConfigResult: (
      state,
      {
        payload: result,
      }: PayloadAction<ConfigResult<BrowserSerializedContinueConfig>>,
    ) => {
      const { config, errors } = result;
      if (!errors || errors.length === 0) {
        state.configError = undefined;
      } else {
        state.configError = errors;
      }

      // If an error is found in config on save,
      // We must invalidate the GUI config too,
      // Since core won't be able to load config
      // Don't invalidate the loaded config
      if (!config) {
        state.config = EMPTY_CONFIG;
      } else {
        state.config = config;
      }
      state.loading = false;
    },
    updateConfig: (
      state,
      { payload: config }: PayloadAction<BrowserSerializedContinueConfig>,
    ) => {
      state.config = config;
    },
    setConfigLoading: (state, { payload: loading }: PayloadAction<boolean>) => {
      state.loading = loading;
    },
    setIdeSettings: (
      state,
      { payload: ideSettings }: PayloadAction<IdeSettings>,
    ) => {
      state.ideSettings = ideSettings;
    },
  },
  selectors: {
    selectSelectedChatModelContextLength: (state): number => {
      return (
        state.config.selectedModelByRole.chat?.contextLength ||
        DEFAULT_CONTEXT_LENGTH
      );
    },
    selectSelectedChatModel: (state) => {
      return state.config.selectedModelByRole.chat;
    },
    selectUIConfig: (state) => {
      return state.config?.ui ?? null;
    },
    selectHideSettingsIcon: (state): boolean => {
      return state.ideSettings?.hideSettingsIcon ?? false;
    },
    selectHideModelSelector: (state): boolean => {
      return state.ideSettings?.hideModelSelector ?? false;
    },
    selectHideModeSelector: (state): boolean => {
      return state.ideSettings?.hideModeSelector ?? false;
    },
    selectDefaultMode: (state) => {
      return state.ideSettings?.defaultMode ?? "agent";
    },
    selectIdeSettings: (state) => {
      return state.ideSettings;
    },
  },
});

export const { updateConfig, setConfigResult, setConfigLoading, setIdeSettings } =
  configSlice.actions;

export const {
  selectSelectedChatModelContextLength,
  selectUIConfig,
  selectSelectedChatModel,
  selectHideSettingsIcon,
  selectHideModelSelector,
  selectHideModeSelector,
  selectDefaultMode,
  selectIdeSettings,
} = configSlice.selectors;

export default configSlice.reducer;
