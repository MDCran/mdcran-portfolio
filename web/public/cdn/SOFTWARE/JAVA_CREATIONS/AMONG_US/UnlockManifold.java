import java.util.Random;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Scanner;
import java.util.Arrays;

public class UnlockManifold extends Task {

    public UnlockManifold(Location taskLocation) {
        super("Unlock Manifold", taskLocation);
    }

    @Override
    public void run() {
        super.printTaskInfo();

        ArrayList<Integer> randomNumbers = new ArrayList<Integer>();
        Scanner input = new Scanner(System.in);

        for(int i = 0; i < 10; i++) {
            randomNumbers.add(new Random().nextInt(100) + 1);
        }

        System.out.println("Sort the following numbers least to greatest: [# # # ...]");
        for (int i = 0; i < randomNumbers.size(); i++) {
            System.out.print(Terminal.WHITE + Terminal.BLACK_BACKGROUND + " " + randomNumbers.get(i) + " " + Terminal.RESET + "   ");
        }
        System.out.println();

        Collections.sort(randomNumbers);

        String userInput = input.nextLine();

        String[] split = userInput.split(" ");

        ArrayList<String> userInputString = new ArrayList<String>(Arrays.asList(split));
        ArrayList<Integer> userInputInteger = new ArrayList<Integer>();
        for (int i = 0; i < userInputString.size(); i++) {
            userInputInteger.add(Integer.parseInt(userInputString.get(i)));
        }
        System.out.println(Arrays.asList(userInputInteger));

        if (match(userInputInteger, randomNumbers)) {
            System.out.println(Terminal.RESET + Terminal.GREEN_BACKGROUND + "                                               " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.GREEN_BACKGROUND +  "    YOU COMPLETED THE UNLOCK MANIFOLD TASK!    " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.GREEN_BACKGROUND + "                                               " + Terminal.RESET);
        } else {
            System.out.println(Terminal.RESET + Terminal.RED_BACKGROUND + "                                               " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.RED_BACKGROUND +  "      YOU FAILED THE UNLOCK MANIFOLD TASK!     " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.RED_BACKGROUND + "                                               " + Terminal.RESET);
        }

    }

    public boolean match(ArrayList<Integer> arrList, ArrayList<Integer> match) {
        if (!(match.size() == arrList.size())) {
            return false;
        }
        for(int i = 0; i < match.size(); i++) {
            if (!(match.get(i) == arrList.get(i))) {
                return false;
            }
        }
        return true;
    }

}