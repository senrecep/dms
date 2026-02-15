import { getTranslations } from "next-intl/server";
import { getPendingReadTasks, getCompletedReadTasks } from "@/actions/read-confirmations";
import { ReadTaskList } from "@/components/read-tasks/read-task-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ReadTasksPage() {
  const t = await getTranslations();
  const [pendingTasks, completedTasks] = await Promise.all([
    getPendingReadTasks(),
    getCompletedReadTasks(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("notifications.types.readAssignment")}
        </h1>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t("readTasks.pending")} ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("readTasks.completed")} ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <ReadTaskList tasks={pendingTasks} showConfirmButton />
        </TabsContent>
        <TabsContent value="completed">
          <ReadTaskList tasks={completedTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
