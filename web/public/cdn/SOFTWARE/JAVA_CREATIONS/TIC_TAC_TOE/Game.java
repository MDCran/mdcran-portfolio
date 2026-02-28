import java.util.Scanner;

public class Game {
    
    private static String RESET = "\033[0m";
    private static final String WHITE = "\033[0;37m";
    private static final String GREEN = "\033[0;92m";
    private static final String BLACK_BACKGROUND = "\033[40m";
    private static final String RED_BACKGROUND = "\033[41m";
    
    private static String[] letterX = {
                                "██╗  ██╗",
                                "╚██╗██╔ ",
                                " ╚███╔╝ ",
                                " ██╔██╗ ",
                                "██╔╝╚██╗",
                                "╚═╝  ╚═╝"
                               };
                       
    private static String[] letterO = {
                                " █████╗ ",
                                "██╔══██╗",
                                "██║  ██║",
                                "██║  ██║",
                                "╚█████╔╝",
                                " ╚════╝ "
                               };

    public static void message(int id) {
        switch(id) {
            case 1:
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "      READY TO PLAY TIC-TAC-TOE? [PRESS ENTER]      " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                break;
            case 2:
                System.out.print("ROW:" + GREEN + " ");
                break;
            case 3:
                System.out.print("COLUMN:" + GREEN + " ");
                break;
            case 4:
                System.out.println(WHITE + RED_BACKGROUND + "                                                    " + RESET);
                System.out.println(WHITE + RED_BACKGROUND + "  [ERROR] YOUR INPUT IS INVALID OR DOES NOT EXIST!  " + RESET);
                System.out.println(WHITE + RED_BACKGROUND + "                                                    " + RESET);
                break;
            case 5:
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "                     \"O\"'s WON!                     " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                break;
            case 6:
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "                     \"X\"'s WON!                     " + RESET);
                System.out.println(WHITE + BLACK_BACKGROUND + "                                                    " + RESET);
                break;
            default:
                System.out.println("Message Not Found!");
                break;
        }
    }
    
    public static void requireEnterKey() {
        System.console().readLine();
    }
    
    public static void printBoard(TicTacToe game) {
        String[][] board = game.getBoard();
        for(int row = 0; row < 3; row++) {
            for(int i = 0; i < 6; i++) {
                for (int col = 0; col < 3; col++) {
                    if (board[row][col].equals("X")) {
                        System.out.print("  " + letterX[i] + "  ");
                    } else if (board[row][col].equals("O")) {
                        System.out.print("  " + letterO[i] + "  ");
                    } else {
                        System.out.print("            ");
                    }
                    if (col == 0 || col == 1) {
                        System.out.print("██");
                    }
                }
                System.out.println();
            }
            if (row != 2) {
                System.out.println("            ██            ██            ");
                System.out.println("████████████████████████████████████████");
                System.out.println("            ██            ██            ");
            }
        }
        
    }
    public static void userTurn(TicTacToe game) {
        Scanner input = new Scanner(System.in);
        boolean chosen = false;
        while (!chosen) {
            System.out.println();
            Game.message(2);
            int row = input.nextInt();
            System.out.print(RESET);
            Game.message(3);
            int col = input.nextInt();
            System.out.print(RESET);
            row--;
            col--;
            System.out.println();
            if (game.pickLocation(row, col)) {
                game.takeTurn(row,col);
                chosen = true;
            } else {
                Game.message(4);
            }
        }
    }
    
    public static void printWin(TicTacToe game) {
        System.out.println();
        if (game.getTurn() % 2 == 0) {
            Game.message(5);
        } else {
            Game.message(6);
        }
    }
    
    
    
}