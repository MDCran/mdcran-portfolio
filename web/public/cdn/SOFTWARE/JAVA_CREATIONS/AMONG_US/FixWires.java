import java.util.ArrayList;
import java.util.Collections;
import java.util.Scanner;

public class FixWires extends Task{
    public FixWires(Location taskLocation) {
        super("Fix Wires", taskLocation);
    }

    @Override
    public void run() {
        super.printTaskInfo();

        Scanner input = new Scanner(System.in);

        ArrayList<String> wires = new ArrayList<String>();

        wires.add(Terminal.RESET + Terminal.RED + " △ (RED) " + Terminal.RESET);
        wires.add(Terminal.RESET + Terminal.YELLOW_BRIGHT + " ◯ (Yellow) " + Terminal.RESET);
        wires.add(Terminal.RESET + Terminal.PURPLE_BRIGHT + " ☆ (Pink) " + Terminal.RESET);
        wires.add(Terminal.RESET + Terminal.BLUE + " X (Blue) " + Terminal.RESET);

        Collections.shuffle(wires);
        System.out.println("Connect the Wires: ");
        for (String wire : wires) {
            System.out.println(Terminal.RESET + "   " + wire);
        }
        System.out.println("Fix Wires: " + Terminal.BLACK_BACKGROUND + Terminal.WHITE + "(Type the Index of the Correct Wire)" + Terminal.RESET);

        ArrayList<String> wiresShuffled = new ArrayList<String>(wires);
        Collections.shuffle(wiresShuffled);

        ArrayList<Integer> indexInputs = new ArrayList<Integer>();
        for (String s : wiresShuffled) {
            System.out.print(Terminal.RESET + "   " + s + Terminal.BLACK_BACKGROUND + Terminal.WHITE + " = " + Terminal.RESET);
            indexInputs.add(input.nextInt() - 1);
        }

        if (correctWires(indexInputs, wiresShuffled, wires)) {
            System.out.println(Terminal.RESET + Terminal.GREEN_BACKGROUND + "                                               " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.GREEN_BACKGROUND +  "       YOU COMPLETED THE FIX WIRES TASK!       " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.GREEN_BACKGROUND + "                                               " + Terminal.RESET);
        } else {
            System.out.println(Terminal.RESET + Terminal.RED_BACKGROUND + "                                               " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.WHITE + Terminal.RED_BACKGROUND +  "         YOU FAILED THE FIX WIRES TASK!        " + Terminal.RESET);
            System.out.println(Terminal.RESET + Terminal.RED_BACKGROUND + "                                               " + Terminal.RESET);
        }

    }

    public boolean correctWires(ArrayList<Integer> indexInputs, ArrayList<String> wiresShuffled, ArrayList<String> wires) {
        for (int i = 0; i < indexInputs.size(); i++) {
            if (!(wiresShuffled.get(i).equalsIgnoreCase(wires.get(indexInputs.get(i))))) {
                return false;
            }
        }
        return true;
    }

}