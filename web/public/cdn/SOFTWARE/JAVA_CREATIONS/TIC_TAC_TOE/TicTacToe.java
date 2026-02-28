public class TicTacToe {
    
   // Board 2D Array
   private String[][] board = new String[3][3];
   // Turn Variable
   private int turn;
  
   // Constructor
   public TicTacToe() {
       for(int i = 0; i <=2; i++) {
           for(int j = 0; j <=2; j++) {
               board[i][j] = "-";
           }
       }
   }
   
   // Return Current Turn
   public int getTurn() {
       return turn;
   }
   
   // Get the Board
   public String[][] getBoard() {
       return board;
   }
   
   // Print the Board
   public void printBoard() {
       System.out.println("  0 1 2");
       for (int row = 0; row < 3; row++) {
           System.out.print(row + " ");
           for (int col = 0; col < 3; col++) {
               System.out.print(board[row][col] + " ");
           }
           System.out.println();
       }
   }
   
   // Return Legal Location (Is Valid Space?)
   public boolean pickLocation(int row, int col) {
       if (row >= 3 || col >= 3) {
           return false;
       }
       return (board[row][col].equals("-"));
   }
   
   // Play a Turn
   public void takeTurn(int row, int col) {
       if (turn % 2 == 0) {
           board[row][col] = "X";
       } else {
           board[row][col] = "O";
       }
       turn++;
   }
   
   //This method returns a boolean that returns true if a row has three X or O's in a row
   public boolean checkRow() {
       boolean hasWon = false;
       for (int i = 0; i < 3; i++) {
           if ( 
                (board[i][0].equals("X") && board[i][1].equals("X") && board[i][2].equals("X")) || 
                (board[i][0].equals("O") && board[i][1].equals("O") && board[i][2].equals("O")) 
              ) {
                hasWon = true;
            }
       }
       return hasWon;
   }
   
    //This method returns a boolean that returns true if a col has three X or O's
   public boolean checkCol() {
       boolean hasWon = false;
       for (int i = 0; i < 3; i++) {
           if ( 
                (board[0][i].equals("X") && board[1][i].equals("X") && board[2][i].equals("X")) || 
                (board[0][i].equals("O") && board[1][i].equals("O") && board[2][i].equals("O")) 
              ) {
                hasWon = true;
            }
       }
       return hasWon;
   }
   
    //This method returns a boolean that returns true if either diagonal has three X or O's
   public boolean checkDiag() {
       boolean hasWon = false;
       if (((board[0][0].equals("X") && board[1][1].equals("X") && board[2][2].equals("X")) || (board[0][2].equals("X") && board[1][1].equals("X") && board[2][0].equals("X"))) || ((board[0][0].equals("O") && board[1][1].equals("O") && board[2][2].equals("O")) || (board[0][2].equals("O") && board[1][1].equals("O") && board[2][0].equals("O")))) {
              hasWon = true;
       }
       return hasWon;
   }
   
   //This method returns a boolean that checks if someone has won the game
   public boolean checkWin() {
       return (checkDiag() || checkCol() || checkRow());
   }

}