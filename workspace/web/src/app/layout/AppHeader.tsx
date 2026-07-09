import { Layout } from "antd";
import { ProductBrand } from "./ProductBrand";
import { ProjectSwitcher } from "./ProjectSwitcher";
import "./app-header.css";

const { Header } = Layout;

export function AppHeader() {
  return (
    <Header className="app-header">
      <ProductBrand />
      <ProjectSwitcher />
    </Header>
  );
}
