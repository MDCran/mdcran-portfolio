import java.util.Scanner;

public class GameSelector {
    
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        String name = Response.getName();
        Display.bot();
        System.out.println();
        Game.wait(4000);
        System.out.println(Color.WHITE + Color.PURPLE_BACKGROUND + name + Color.RESET + Color.PURPLE + ":" + Color.RESET + " " + Response.getGreeting());
        Game.wait(6000);
        System.out.println(Color.WHITE + Color.PURPLE_BACKGROUND + name + Color.RESET + Color.PURPLE + ":" + Color.RESET + " " + "Anyways, choose a game from the list below to play!");
        Game.wait(2000);
        System.out.println();
        System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                        " + Color.RESET);
        System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "   CHOOSE A GAME BELOW! [TYPE LETTER]   " + Color.RESET);
        System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                        " + Color.RESET);
        System.out.println();
        System.out.println("    " + Color.WHITE + Color.BLUE_BACKGROUND + " A " + Color.RESET + " - " + Color.BLUE + "Connect Four" + Color.RESET);
        System.out.print(Color.WHITE + Color.WHITE_BACKGROUND);
        if (input.nextLine().toLowerCase().equals("a")) {
            Game.wait(500);
            System.out.println();
            System.out.println(Color.BLUE + "Starting " + Color.BLUE_UNDERLINED + "Connect Four" + Color.RESET + Color.BLUE + "..." + Color.RESET);
            System.out.println();
            Game.wait(3000);
            ConnectFour.startGame();
            
        } else {
            Game.wait(1000);
            System.out.println();
            System.out.println(Color.RED + "[SYSTEM DEFAULT] " + Color.BLUE + "Starting " + Color.BLUE_UNDERLINED + "Connect Four" + Color.RESET + Color.BLUE + "..." + Color.RESET);
            System.out.println();
            Game.wait(3000);
            ConnectFour.startGame();
        }
        
    }
}