import type { StepFieldsProps } from "../types";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function ReadyFields({ step, patchParams }: StepFieldsProps) {
  return <ReadySelectorsField step={step} patchParams={patchParams} />;
}
