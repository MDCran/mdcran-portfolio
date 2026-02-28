import java.util.ArrayList;
import java.util.Scanner;

public class Game {
    
    private static String playerOne;
    private static String playerTwo; 
    private static ArrayList<Integer> playerOneSlots = new ArrayList<Integer>();
    private static ArrayList<Integer> playerTwoSlots = new ArrayList<Integer>();
    private static int playerOneWins;
    private static int playerTwoWins;
    private static int columnChoice;
    private static Scanner input = new Scanner(System.in);
    private static boolean hasPlayed = false;
    
    
    public static int playerWins(int playerNumber) {
        if (playerNumber == 1) {
            return playerOneWins;
        } else if (playerNumber == 2) {
            return playerTwoWins;
        }
        return -1;
    }
    
    public static boolean hasPlayed() {
        return hasPlayed;
    }
    
    public static ArrayList<Integer> getSlots(int playerNumber) {
        if (playerNumber == 1) {
            return playerOneSlots;
        } else if (playerNumber == 2) {
            return playerTwoSlots;
        }
        return new ArrayList<Integer>(-1);
    }
    
    public static void setup() {
        playerOneSlots = new ArrayList<Integer>();
        playerTwoSlots = new ArrayList<Integer>();
    }
    
    public static void wait(int ms) {
        try
        {
            Thread.sleep(ms);
        }
        catch(InterruptedException ex)
        {
            Thread.currentThread().interrupt();
        }
    }
    
    public static void setPlayer(int playerNumber, String name) {
        if (playerNumber == 1) {
            playerOne = name;
        } else if (playerNumber == 2) {
            playerTwo = name;
        }
    }
    
    public static String getPlayer(int playerNumber) {
        if (playerNumber == 1) {
            return playerOne;
        } else if (playerNumber == 2) {
            return playerTwo;
        }
        return "Player not found!";
    }
    
    public static Integer getLowestPlayableSlot(int column) {
        int maxSlot = column + 35;
        int lowestSlot = 0;
        for (int i = maxSlot; i >= column; i-=7) {
            if (!playerOneSlots.contains(i) && !playerTwoSlots.contains(i)) {
                lowestSlot = i;
                return lowestSlot;
            } else {
                lowestSlot = 0;
            }
        }
        return lowestSlot;
    }
    
    public static void setTurn(int turn) {
        if (checkWin() == 1) {
            Letter.printMessage(playerOne + " Wins");
            playerOneWins++;
            hasPlayed = true;
            wait(7500);
            ConnectFour.startGame();
            return;
            
        } else if (checkWin() == 2) {
            Letter.printMessage(playerTwo + " Wins");
            playerTwoWins++;
            hasPlayed = true;
            wait(7500);
            ConnectFour.startGame();
            return;
        }
        int lowestSlot;
        

        if (turn == 1) {
            System.out.print(Color.WHITE + Color.RED_BACKGROUND + playerOne + Color.RESET + " would like to go in column " + Color.WHITE + Color.BLACK_BACKGROUND);
            System.out.print(Color.RESET);
            columnChoice = input.nextInt();
            if (columnChoice <= 7 && columnChoice >= 1) {
                if (!playerOneSlots.contains(columnChoice) && !playerTwoSlots.contains(columnChoice)) {
                    playerOneSlots.add(getLowestPlayableSlot(columnChoice));
                    Display.board();
                    setTurn(2);
                } else {
                    System.out.println();
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                            " + Color.RESET);
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "   [!] You must choose a playable column!   " + Color.RESET);
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                            " + Color.RESET);
                    System.out.println();
                    setTurn(1);
                }
            } else {
                System.out.println();
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                       " + Color.RESET);
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "   [!] You must enter a value 1 - 7!   " + Color.RESET);
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                       " + Color.RESET);
                System.out.println();
                setTurn(1);
            }
        } else if (turn == 2) {
            System.out.print(Color.BLACK + Color.YELLOW_BACKGROUND_BRIGHT + playerTwo + Color.RESET + " would like to go in column " + Color.WHITE + Color.BLACK_BACKGROUND);
            System.out.print(Color.RESET);
            columnChoice = input.nextInt();
            if (columnChoice <= 7 && columnChoice >= 1) {
                if (!playerOneSlots.contains(columnChoice) && !playerTwoSlots.contains(columnChoice)) {
                    playerTwoSlots.add(getLowestPlayableSlot(columnChoice));
                    Display.board();
                    setTurn(1);
                } else {
                    System.out.println();
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                            " + Color.RESET);
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "   [!] You must choose a playable column!   " + Color.RESET);
                    System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                            " + Color.RESET);
                    System.out.println();
                    setTurn(2);
                }
            } else {
                System.out.println();
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                       " + Color.RESET);
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "   [!] You must enter a value 1 - 7!   " + Color.RESET);
                System.out.println(Color.WHITE + Color.RED_BACKGROUND + "                                       " + Color.RESET);
                System.out.println();
                setTurn(2);
            }
        }
    }
    
    
    public static Integer checkWin() {
        for (int i = 1; i <= 46; i++) {
            // -
            if (playerOneSlots.contains(i) && playerOneSlots.contains(i + 1) && playerOneSlots.contains(i + 2) && playerOneSlots.contains(i + 3)) {
                if (i != 5 || i != 6 || i != 7 || i != 12 || i != 13 || i != 14 || i != 19 || i != 20 || i != 21 || i != 26 || i != 27 || i != 28 || i != 33 || i != 34 || i != 35 || i != 40 || i != 41 || i != 42) {
                    return 1;
                }
            }
            // \
            if (playerOneSlots.contains(i) && playerOneSlots.contains(i + 8) && playerOneSlots.contains(i + 16) && playerOneSlots.contains(i + 24)) {
                if (i != 5 || i != 6 || i != 7 || i != 13 || i != 14 || i != 21 || i != 22 || i != 29 || i != 30 || i != 36 || i != 37 || i != 38) {
                    return 1;
                }
            }
            // /
            if (playerOneSlots.contains(i) && playerOneSlots.contains(i + 6) && playerOneSlots.contains(i + 12) && playerOneSlots.contains(i + 18)) {
                if (i < 22 && i > 42) {
                    return 1;
                }
            }
            // |
            if (playerOneSlots.contains(i) && playerOneSlots.contains(i + 7) && playerOneSlots.contains(i + 14) && playerOneSlots.contains(i + 21)) {
                if (i != 1 || i != 2 || i != 3 || i != 8 || i != 9 || i != 15 || i != 28 || i != 34 || i != 35 || i != 40 || i != 41 || i != 42) {
                    return 1;
                }
            }
            // -
            if (playerTwoSlots.contains(i) && playerTwoSlots.contains(i + 1) && playerTwoSlots.contains(i + 2) && playerTwoSlots.contains(i + 3)) {
                if (i != 5 || i != 6 || i != 7 || i != 12 || i != 13 || i != 14 || i != 19 || i != 20 || i != 21 || i != 26 || i != 27 || i != 28 || i != 33 || i != 34 || i != 35 || i != 40 || i != 41 || i != 42) {
                    return 2;
                }
            }
            // \
            if (playerTwoSlots.contains(i) && playerTwoSlots.contains(i + 8) && playerTwoSlots.contains(i + 16) && playerTwoSlots.contains(i + 24)) {
                if (i != 5 || i != 6 || i != 7 || i != 13 || i != 14 || i != 21 || i != 22 || i != 29 || i != 30 || i != 36 || i != 37 || i != 38) {
                    return 2;
                }
            }
            // /
            if (playerTwoSlots.contains(i) && playerTwoSlots.contains(i + 6) && playerTwoSlots.contains(i + 12) && playerTwoSlots.contains(i + 18)) {
                if (i < 22 && i > 42) {
                    return 2;
                }
            }
            // |
            if (playerTwoSlots.contains(i) && playerTwoSlots.contains(i + 7) && playerTwoSlots.contains(i + 14) && playerTwoSlots.contains(i + 21)) {
                if (i != 1 || i != 2 || i != 3 || i != 8 || i != 9 || i != 15 || i != 28 || i != 34 || i != 35 || i != 40 || i != 41 || i != 42) {
                    return 2;
                }
            }
        }
        return 0;
    }
}