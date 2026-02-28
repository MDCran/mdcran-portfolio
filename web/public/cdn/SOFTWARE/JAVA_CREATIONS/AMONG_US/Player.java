import java.util.ArrayList;

public class Player {

    String name;
    String color;
    boolean isImposter;
    Location location;
    static ArrayList<String> usedColors = new ArrayList<String>();
    static String[] validColors = {"Red", "Green", "Yellow", "Blue", "Purple", "Cyan", "Lime", "Pink", "Aqua", "Orange"};
    boolean isAlive = true;
    ArrayList<Task> tasks = new ArrayList<Task>();

    public Player(String name, String color) {
        this.name = name;
        this.color = color;
        this.usedColors.add(color);
    }

    public void addTask(Task taskName) {
        tasks.add(taskName);
    }

    public void removeTask(Task taskName) {
        for (int i = 0; i < tasks.size(); i ++) {
            if (tasks.get(i).getTaskName().equalsIgnoreCase(taskName.getTaskName()) && tasks.get(i).getTaskLocation().getLocName().equalsIgnoreCase(taskName.getTaskLocation().getLocName())) {
                tasks.remove(i);
                break;
            }
        }
    }

    public static boolean colorIsUsed(String color) {
        for(int i = 0; i < usedColors.size(); i++) {
            if (usedColors.get(i).equalsIgnoreCase(color)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isValidColor(String color) {
        for(int i = 0; i < validColors.length; i++) {
            if (color.equalsIgnoreCase(validColors[i])) {
                return true;
            }
        }
        return false;
    }

    public void setName(String name) {
        this.name = name;
    }
    public String getName() {
        return name;
    }

    public void setColor(String color) {
        this.color = color;
    }
    public String getColor() {
        return color;
    }

    public void setImposter(boolean status) {
        isImposter = status;
    }
    public boolean isImposter() {
        return isImposter;
    }

    public void setAlive(boolean status) {
        isAlive = status;
    }

    public boolean isAlive() {
        return isAlive;
    }

    public void setLocation(Location location) {
        this.location = location;
    }
    public Location getLocation() {
        return location;
    }

}