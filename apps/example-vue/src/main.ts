import { TruapiPlugin } from "@use-truapi/vue";
import { createApp } from "vue";
import App from "./App.vue";
import { config } from "./config";
import "./style.css";

createApp(App).use(TruapiPlugin, { config }).mount("#app");
