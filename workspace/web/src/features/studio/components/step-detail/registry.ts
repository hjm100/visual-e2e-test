import type { ComponentType } from "react";
import type { StepType } from "../../../../types/scenario";
import type { StepFieldsProps } from "./types";
import { ClickFields } from "./fields/ClickFields";
import { HoverFields } from "./fields/HoverFields";
import { InputFields } from "./fields/InputFields";
import { KeyboardFields } from "./fields/KeyboardFields";
import { LinkFields } from "./fields/LinkFields";
import { ValueOnlyFields } from "./fields/ValueOnlyFields";
import { ReadyFields } from "./fields/ReadyFields";
import { ScrollFields } from "./fields/ScrollFields";
import { VerifyFields } from "./fields/VerifyFields";
import { MacroFields } from "./fields/MacroFields";

export const STEP_TYPE_FIELDS: Record<StepType, ComponentType<StepFieldsProps>> = {
  click: ClickFields,
  hover: HoverFields,
  input: InputFields,
  keyboard: KeyboardFields,
  link: LinkFields,
  wait: ValueOnlyFields,
  log: ValueOnlyFields,
  screenshot: ValueOnlyFields,
  ready: ReadyFields,
  scroll: ScrollFields,
  verify: VerifyFields,
  macro: MacroFields,
};
