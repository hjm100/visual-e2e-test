import { Typography } from "antd";
import "./app-header.css";

export function ProductBrand() {
  return (
    <div className="app-header__brand">
      <img
        src="/favicon-32x32.png"
        alt="Visual E2E Test"
        className="app-header__logo"
        width={32}
        height={32}
      />
      <div className="app-header__brand-text">
        <Typography.Text className="app-header__brand-name" ellipsis>
          Visual E2E Test
        </Typography.Text>
        <Typography.Text className="app-header__brand-tagline" ellipsis type="secondary">
          JSON-driven E2E Workbench
        </Typography.Text>
      </div>
    </div>
  );
}
