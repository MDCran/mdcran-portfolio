import java.util.ArrayList;

public class Task {

    String taskName;
    Location taskLocation;

    public Task(String taskName, Location taskLocation) {
        this.taskName = taskName;
        this.taskLocation = taskLocation;
        taskLocation.addTask(this);
    }

    public Location getTaskLocation() {
        return taskLocation;
    }

    public String getTaskName() {
        return taskName;
    }

    public void printTaskInfo() {
        Terminal.printMessage(getTaskName());
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND +  "\t\t\tCURRENT LOCATION: " + getTaskLocation().getLocName() + "\t\t\tTASK: " + getTaskName() + "\t\t\t" + Terminal.RESET);
    }

    public void run() {

    }
}