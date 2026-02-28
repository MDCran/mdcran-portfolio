import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Random;

public class Map {
    String map;
    Location defaultLocation;
    ArrayList<Player> playerList = new ArrayList<Player>();
    ArrayList<Location> mapLocationList = new ArrayList<Location>();
    int imposterCount = 0;
    int forceImposterCount = -1;
    static String imposterNameHack = "ADMIN";
    ArrayList<Task> taskList = new ArrayList<Task>();

    public Map(String map, ArrayList<Player> playerList) {
        this.map = map;
        this.playerList = playerList;
    }

    public static void setImposterNameHack(String name) {
        imposterNameHack = name;
    }

    public static String getImposterNameHack() {
        return imposterNameHack;
    }

    public void addLocation(Location loc) {
        mapLocationList.add(loc);
    }

    public void setStartLocation(Location location) {
        for (int i = 0; i < playerList.size(); i++) {
            this.defaultLocation = location;
            getPlayers().get(i).setLocation(location);
        }
    }

    public void addTask(Task taskName) {
        taskList.add(taskName);
    }

    public Location getLocation(String location) {
        for (int i = 0; i < mapLocationList.size(); i++) {
            if(mapLocationList.get(i).getLocName().equalsIgnoreCase(location)) {
                return mapLocationList.get(i);
            }
        }
        return new Location("Space", 0);
    }

    public ArrayList<Location> getLocations() {
        return mapLocationList;
    }

    public ArrayList<String> getMap() {
        return new ArrayList<String>(Arrays.asList("N/A"));
    }

    public ArrayList<Player> getPlayers() {
        return playerList;
    }



    public void sortTeams(int imposterCount) {

        imposterCount = forceImposterCount;
        for (int i = 0; i < playerList.size(); i++) {
            if (playerList.get(i).getName().equalsIgnoreCase(imposterNameHack)) {
                playerList.get(i).setImposter(true);
                this.imposterCount++;
            }
        }
        for (int i = this.imposterCount; i < imposterCount; i++) {
            int randomImposterIndex = (int) (Math.random() * playerList.size());
            playerList.get(randomImposterIndex).setImposter(true);
            this.imposterCount++;
        }
    }

    public void sortTasks(int taskAmount) {


        for(int i = 0; i < getPlayers().size(); i++) {
            ArrayList<Task> tasks = new ArrayList<Task>();
            for (Task task : taskList) {
                tasks.add(task);
            }
            for (int j = 0; j < taskAmount; j++) {
                if (tasks.size() >= 1) {
                    int random =  new Random().nextInt(tasks.size()) + 1;
                    getPlayers().get(i).addTask(tasks.get(j));
                    tasks.remove(tasks.get(j));
                }

            }
        }
    }

    public void printTeams(){
        for (int i = 0; i < playerList.size(); i++) {
            if (playerList.get(i).isImposter()) {
                System.out.println("[IMPOSTER] " + playerList.get(i).getName());
            } else {
                System.out.println("[CREWMATE] " + playerList.get(i).getName());
            }
        }
    }

}