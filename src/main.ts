import "./styles.css";
import { renderCommandCenter } from "./features/command-center/components/CommandCenter";
import { commandCenterData } from "./features/command-center/data";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = renderCommandCenter(commandCenterData);
