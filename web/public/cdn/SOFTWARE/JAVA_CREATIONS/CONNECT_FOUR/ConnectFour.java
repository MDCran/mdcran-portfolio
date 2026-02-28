import java.util.Scanner;

public class ConnectFour {
    
    private static Scanner input = new Scanner(System.in);
    
    public static void startGame() {
        System.out.println(Color.RESET);
        if (Game.hasPlayed()) {
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                   " + Color.RESET);
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + " WANT TO PLAY AGAIN? [PRESS ENTER] " + Color.RESET);
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                   " + Color.RESET);
        } else {
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                        " + Color.RESET);
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + " READY TO START THE GAME? [PRESS ENTER] " + Color.RESET);
            System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + "                                        " + Color.RESET);
        }
        System.console().readLine();
        Display.title();
        Game.setup();
        if (!Game.hasPlayed()) {
            System.out.print("Please Enter Player #1's Name: " + Color.WHITE + Color.RED_BACKGROUND);
            Game.setPlayer(1, input.nextLine().toUpperCase());
            
            System.out.print(Color.RESET + "Please Enter Player #2's Name: " + Color.WHITE + Color.YELLOW_BACKGROUND_BRIGHT);
            Game.setPlayer(2, input.nextLine().toUpperCase());
        } else {
            System.out.println(Color.WHITE + Color.RED_BACKGROUND + Game.getPlayer(1) + Color.RESET + " vs " + Color.YELLOW_BACKGROUND_BRIGHT + Game.getPlayer(2) + Color.RESET);
            if (Game.playerWins(1) > Game.playerWins(2)) {
                System.out.println(Color.WHITE + Color.BLACK_BACKGROUND + Game.playerWins(1) + Color.RESET + " - " + Game.playerWins(2) + Color.RESET);
                System.out.println();
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + Game.getPlayer(1) + Color.RESET + " is winning!" + Color.RESET);
            } else if (Game.playerWins(1) < Game.playerWins(2)) {
                System.out.println(Game.playerWins(1) + Color.RESET + " - " + Color.WHITE + Color.BLACK_BACKGROUND + Game.playerWins(2) + Color.RESET);
                System.out.println();
                System.out.println(Color.YELLOW_BACKGROUND_BRIGHT + Game.getPlayer(2) + Color.RESET + " is winning!" + Color.RESET);
            } else {
                System.out.println(Game.playerWins(1) + Color.RESET + " - " + Game.playerWins(2) + Color.RESET);
                System.out.println();
                System.out.println("You are tied!");
            }
            
        }
        System.out.print(Color.RESET);
        Display.board();
        Game.setTurn(1);
    }


    

    

    
}