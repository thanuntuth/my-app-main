export type ActivityLog = {
  id: number;
  user: string;
  action: string;
  date: string;
};

export function addActivityLog(
  user: string,
  action: string
) {
  const logs: ActivityLog[] = JSON.parse(
    localStorage.getItem("activityLogs") || "[]"
  );

  const newLog: ActivityLog = {
    id: Date.now(),
    user,
    action,
    date: new Date().toLocaleString("th-TH"),
  };

  localStorage.setItem(
    "activityLogs",
    JSON.stringify([...logs, newLog])
  );
}

export function getActivityLogs(): ActivityLog[] {
  return JSON.parse(
    localStorage.getItem("activityLogs") || "[]"
  );
}