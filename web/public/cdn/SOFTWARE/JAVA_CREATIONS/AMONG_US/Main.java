import java.util.ArrayList;
import java.util.Arrays;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        //dupe numbers unlocmanifolds

        Scanner input = new Scanner(System.in);
        ArrayList<Player> playerList = new ArrayList<Player>();

        boolean skipPlayerMaking = false;

        System.out.println(Terminal.RESET + Terminal.BLACK_BACKGROUND + Terminal.WHITE + "Available: (INH | PC | SPM | IC)" + Terminal.RESET);
        System.out.print("SECRET_CODE=");
        String userInput = input.nextLine();

        userInput = userInput.replace("[","");
        userInput = userInput.replace("]","");
        String[] split = userInput.split(",");
        int imposterCount = 2;
        int playerCount = 10;
        ArrayList<String> userInputString = new ArrayList<String>(Arrays.asList(split));
        for (int i = 0; i < userInputString.size(); i++) {
            String txt = userInputString.get(i);
            if (txt.contains("INH=")) {
                txt = txt.replace("INH=","");
                Map.setImposterNameHack(txt);
                //System.out.println("INH=" + txt);
            } else if (txt.contains("PC=")) {
                txt = txt.replace("PC=","");
                playerCount = Integer.parseInt(txt);
            } else if (txt.contains("SPM=")) {
                txt = txt.replace("SPM=","");
                //System.out.println("SPM=" + txt);
                if (txt.equalsIgnoreCase("True")) {
                    skipPlayerMaking = true;
                    ArrayList<Player> placeholderPlayers = new ArrayList<Player>();
                    placeholderPlayers.add(new Player("Red", "RED"));
                    placeholderPlayers.add(new Player("Green", "GREEN"));
                    placeholderPlayers.add(new Player("Yellow", "YELLOW"));
                    placeholderPlayers.add(new Player("Blue", "BLUE"));
                    placeholderPlayers.add(new Player("Purple", "PURPLE"));
                    placeholderPlayers.add(new Player("Cyan", "CYAN"));
                    placeholderPlayers.add(new Player("Lime", "LIME"));
                    placeholderPlayers.add(new Player("Pink", "PINK"));
                    placeholderPlayers.add(new Player("Aqua", "AQUA"));
                    placeholderPlayers.add(new Player("Orange", "ORANGE"));

                    for (int j = 0; j < playerCount; j++) {
                        playerList.add(placeholderPlayers.get(j));
                    }

                } else if (txt.contains("IC=")) {
                    txt = txt.replace("IC=","");
                    imposterCount = Integer.parseInt(txt);
                }
            }
        }
        Terminal.printMessage("AMONG  US");
        System.out.println("|-------------------------------|");
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " INH " + Terminal.RESET + "| Imposter Name Hack | " + Terminal.WHITE + Terminal.RED_BACKGROUND + Map.getImposterNameHack() + Terminal.RESET);
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " PC  " + Terminal.RESET + "| Player Count       | " + Terminal.WHITE + Terminal.BLACK_BACKGROUND + playerCount + Terminal.RESET);
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " SPM " + Terminal.RESET + "| Skip Player Making | " + ((skipPlayerMaking) ? Terminal.WHITE + Terminal.GREEN_BACKGROUND + "TRUE" + Terminal.RESET : Terminal.WHITE + Terminal.RED_BACKGROUND + "FALSE" + Terminal.RESET));
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " IC  " + Terminal.RESET + "| Imposter Count     | " + Terminal.WHITE + Terminal.BLACK_BACKGROUND + imposterCount + Terminal.RESET);
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " PTC " + Terminal.RESET + "| Player Task Count  | ");
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " CE  " + Terminal.RESET + "| Confirm Ejects     | ");
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " KTC " + Terminal.RESET + "| Kill Turn Cooldown | ");
        System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + " DM  " + Terminal.RESET + "| Debug Mode         | ");
        System.out.println("|-------------------------------|");
        input.nextLine();
        if (!skipPlayerMaking) {
            System.out.println(Terminal.RESET + Terminal.fontColor("Red") + " RED " + Terminal.fontColor() + "    " + Terminal.fontColor("Green") + " GREEN " + Terminal.fontColor() + "    " + Terminal.fontColor("Yellow") + " YELLOW " + Terminal.fontColor() + "    " + Terminal.fontColor("Blue") + " BLUE " + Terminal.fontColor() + "    " + Terminal.fontColor("Purple") + " PURPLE " + Terminal.fontColor() + "    " + Terminal.fontColor("Cyan") + " CYAN " + Terminal.fontColor() + "    " + Terminal.fontColor("Lime") + " LIME " + Terminal.fontColor() + "    " + Terminal.fontColor("Pink") + " PINK " + Terminal.fontColor() + "    " + Terminal.fontColor("Aqua") + " AQUA " + Terminal.fontColor() + "    " + Terminal.fontColor("Orange") + " ORANGE " + Terminal.fontColor());
            for (int i = 1; i <= playerCount; i++) {
                System.out.println("PLAYER #" + i);
                System.out.print("     Please enter your name: ");
                String name = input.nextLine();

                boolean colorIsSet = false;
                String color = "";
                System.out.print("     Please enter a color: ");
                while(!colorIsSet) {
                    color = input.nextLine();
                    if (Player.isValidColor(color) && !Player.colorIsUsed(color)) {
                        colorIsSet = true;
                    } else {
                        System.out.print(" [!] Please enter a color: ");
                    }
                }

                Player player = new Player(name, color);
                playerList.add(player);
            }
        }

        Map map = new Skeld(playerList);

        map.sortTeams(imposterCount);
        map.printTeams();
        for (int i = 0; i < map.getPlayers().size(); i++) {
            Display.display2DMap(map, map.getPlayers().get(i));


            String sideLine = map.getMap().get(45).replace("░", Terminal.RESET + " " + Terminal.RESET).replace("▓", Terminal.RESET + Terminal.fontColor(map.getPlayers().get(i).getColor()) + Terminal.backgroundColor(map.getPlayers().get(i).getColor()) + " " + Terminal.RESET);
            String fullLine = map.getMap().get(46).replace("▓", Terminal.RESET + Terminal.fontColor(map.getPlayers().get(i).getColor()) + Terminal.backgroundColor(map.getPlayers().get(i).getColor()) + " " + Terminal.RESET);
            String singleChar = Terminal.RESET + Terminal.fontColor(map.getPlayers().get(i).getColor()) + Terminal.backgroundColor(map.getPlayers().get(i).getColor()) + " " + Terminal.RESET;
            System.out.println(sideLine);
            System.out.println(singleChar + singleChar + "\t\tPLAYER: " + map.getPlayers().get(i).getName().toUpperCase() + "\t\tTEAM: " + ((map.getPlayers().get(i).isImposter) ? "IMPOSTER" : "CREWMATE") + "\t\tCOLOR: " + map.getPlayers().get(i).getColor().toUpperCase() + "\t\tTASKS COMPLETED: " + 0 + "\t\tTASKS LEFT: " + 0 + "\t\tTASKS (TOTAL): " + 0 + "\t\tCURRENT LOCATION: " + map.getPlayers().get(i).getLocation().getLocName().toUpperCase() + "\t\t" + singleChar + singleChar);
            System.out.println(sideLine);
            System.out.println(fullLine);
        }
    }
}