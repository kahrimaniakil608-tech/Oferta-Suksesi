"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

/** Associates a visible label with its control, including a control inside a price/phone wrapper. */
export default function Field({ children, className }: { children: ReactNode; className?: string }) {
  const id = useId();
  // A wrapping label already names its child. Do not redirect it to another control.
  function containsControl(nodes: ReactNode): boolean {
    return Children.toArray(nodes).some(node => isValidElement(node) &&
      typeof node.type === 'string' &&
      (['input', 'select', 'textarea'].includes(node.type) ||
        containsControl((node.props as { children?: ReactNode }).children)));
  }
  function existingId(nodes: ReactNode): string | undefined {
    for (const node of Children.toArray(nodes)) {
      if (!isValidElement(node) || typeof node.type !== 'string') continue;
      const props = node.props as Record<string, any>;
      if (node.type === 'label' && containsControl(props.children)) continue;
      if (['input','select','textarea'].includes(node.type) && props.type !== 'hidden') return props.id ?? id;
      const found = existingId(props.children);
      if (found) return found;
    }
  }
  const labelTarget = existingId(children) ?? id;
  let controlIndex = 0;
  function connect(nodes: ReactNode): ReactNode {
    return Children.map(nodes, node => {
      if (!isValidElement(node)) return node;
      const element = node as ReactElement<Record<string, any>>;
      const props = element.props;
      if (typeof element.type !== "string") return element;
      if (element.type === "label") {
        if (containsControl(props.children)) return element;
        return cloneElement(element, { htmlFor: props.htmlFor ?? labelTarget });
      }
      const control = ["input", "select", "textarea"].includes(element.type) && props.type !== "hidden";
      if (control) {
        const index = controlIndex++;
        return cloneElement(element, {
          id: props.id ?? (index === 0 ? id : `${id}-${index}`),
        });
      }
      return props.children ? cloneElement(element, {}, connect(props.children)) : element;
    });
  }
  return <div className={className}>{connect(children)}</div>;
}
