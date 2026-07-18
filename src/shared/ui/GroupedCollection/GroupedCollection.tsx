import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref
} from 'react';
import styles from './GroupedCollection.module.css';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export interface GroupedCollectionRootProps extends HTMLAttributes<HTMLDivElement> {}

function Root({ className, children, ...props }: GroupedCollectionRootProps) {
  return (
    <div
      className={cx(styles.root, className)}
      data-grouped-collection="true"
      {...props}
    >
      {children}
    </div>
  );
}

export interface GroupedCollectionNavigationProps extends HTMLAttributes<HTMLElement> {
  label: string;
  header?: ReactNode;
  listClassName?: string;
}

function Navigation({
  label,
  header,
  className,
  listClassName,
  children,
  ...props
}: GroupedCollectionNavigationProps) {
  return (
    <nav
      className={cx(styles.navigation, className)}
      data-grouped-collection-slot="navigation"
      data-has-header={header !== undefined ? 'true' : 'false'}
      aria-label={label}
      {...props}
    >
      {header !== undefined && (
        <div className={styles.navigationHeader} data-grouped-collection-slot="navigation-header">
          {header}
        </div>
      )}
      <div
        className={cx(styles.navigationList, listClassName)}
        data-grouped-collection-slot="navigation-list"
      >
        {children}
      </div>
    </nav>
  );
}

export interface GroupedCollectionNavigationItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-current'> {
  active: boolean;
  ref?: Ref<HTMLButtonElement>;
}

function NavigationItem({
  active,
  className,
  children,
  ref,
  type = 'button',
  ...props
}: GroupedCollectionNavigationItemProps) {
  const localRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) return;
    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        const element = localRef.current;
        const list = element?.closest<HTMLElement>('[data-grouped-collection-slot="navigation-list"]');
        if (!element || !list || list.clientWidth <= 0 || list.clientHeight <= 0) return;

        if (list.scrollWidth <= list.clientWidth + 1) list.scrollLeft = 0;
        if (list.scrollHeight <= list.clientHeight + 1) list.scrollTop = 0;

        const listRect = list.getBoundingClientRect();
        const itemRect = element.getBoundingClientRect();
        const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
        const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
        let nextScrollLeft = list.scrollLeft;
        let nextScrollTop = list.scrollTop;

        if (itemRect.left < listRect.left) nextScrollLeft -= listRect.left - itemRect.left;
        else if (itemRect.right > listRect.right) nextScrollLeft += itemRect.right - listRect.right;
        if (itemRect.top < listRect.top) nextScrollTop -= listRect.top - itemRect.top;
        else if (itemRect.bottom > listRect.bottom) nextScrollTop += itemRect.bottom - listRect.bottom;

        list.scrollLeft = Math.min(maxScrollLeft, Math.max(0, nextScrollLeft));
        list.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [active]);

  return (
    <button
      ref={(element) => {
        localRef.current = element;
        assignRef(ref, element);
      }}
      type={type}
      className={cx(styles.navigationItem, className)}
      data-grouped-collection-slot="navigation-item"
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'location' : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export interface GroupedCollectionContentProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

function Content({ label, className, children, ...props }: GroupedCollectionContentProps) {
  return (
    <div
      className={cx(styles.content, className)}
      data-grouped-collection-slot="content"
      aria-label={label}
      {...props}
    >
      {children}
    </div>
  );
}

export const GroupedCollection = {
  Root,
  Navigation,
  NavigationItem,
  Content
};
