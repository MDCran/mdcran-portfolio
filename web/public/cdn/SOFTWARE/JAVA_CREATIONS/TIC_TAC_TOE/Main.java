public class Main
{
    public static void main(String[] args)
    {
        Game.message(1);
        Game.requireEnterKey();

        TicTacToe game = new TicTacToe();
        
        while (!game.checkWin()) {
            Game.userTurn(game);
            Game.printBoard(game);
        
        }
        
        Game.printWin(game);

        
    }
}