import java.util.ArrayList;

public class Location {
    String locName;
    int lineNum;
    ArrayList<Task> tasks = new ArrayList<Task>();

    public Location(String locName, int lineNum) {
        this.locName = locName;
        this.lineNum = lineNum;
    }

    public void setLocName(String locName) {
        this.locName = locName;
    }

    public String getLocName() {
        return locName;
    }

    public void addTask(Task taskName) {
        tasks.add(taskName);
    }

    public ArrayList<Task> getTasks() {
        return tasks;
    }

    public boolean hasTask(Task taskName) {
        for (Task task : tasks) {
            if (task.getTaskName().equalsIgnoreCase(taskName.getTaskName())) {
                return true;
            }
        }
        return false;
    }

    public void setLineNum(int lineNum) {
        this.lineNum = lineNum;
    }
    public int getLineNum() {
        return lineNum;
    }

}