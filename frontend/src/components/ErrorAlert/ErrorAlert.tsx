import styles from "./ErrorAlert.module.scss";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className={styles.alert} role="alert">
      {message}
    </div>
  );
}
