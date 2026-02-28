import java.util.ArrayList;

public class Terminal {

    public static String fontColor() {
        return "\033[0m";
    }
    public static String fontColor(String color) {
        switch(color.toUpperCase()) {
            case "RED":
                return "\033[0;31m";
            case "GREEN":
                return "\033[0;32m";
            case "YELLOW":
                return "\033[0;93m";
            case "ORANGE":
                return "\033[0;33m";
            case "BLUE":
                return "\033[0;34m";
            case "PURPLE":
                return "\033[0;35m";
            case "CYAN":
                return "\033[0;36m";
            case "LIME":
                return "\033[0;92m";
            case "PINK":
                return "\033[0;95m";
            case "AQUA":
                return "\033[0;96m";
            default:
                return "\033[0m";
        }
    }
    public static String backgroundColor() {
        return "\033[0m";
    }
    public static String backgroundColor(String color) {
        switch(color.toUpperCase()) {
            case "RED":
                return "\033[41m";
            case "GREEN":
                return "\033[42m";
            case "YELLOW":
                return "\033[0;103m";
            case "ORANGE":
                return "\033[43m";
            case "BLUE":
                return "\033[44m";
            case "PURPLE":
                return "\033[45m";
            case "CYAN":
                return "\033[46m";
            case "LIME":
                return "\033[0;102m";
            case "PINK":
                return "\033[0;105m";
            case "AQUA":
                return "\033[0;106m";
            default:
                return "\033[0m";
        }
    }
    // Reset
    public static final String RESET = "\033[0m";  // Text Reset

    // Regular Colors
    public static final String BLACK = "\033[0;30m";   // BLACK
    public static final String RED = "\033[0;31m";     // RED
    public static final String GREEN = "\033[0;32m";   // GREEN
    public static final String YELLOW = "\033[0;33m";  // YELLOW
    public static final String BLUE = "\033[0;34m";    // BLUE
    public static final String PURPLE = "\033[0;35m";  // PURPLE
    public static final String CYAN = "\033[0;36m";    // CYAN
    public static final String WHITE = "\033[0;37m";   // WHITE

    // Bold
    public static final String BLACK_BOLD = "\033[1;30m";  // BLACK
    public static final String RED_BOLD = "\033[1;31m";    // RED
    public static final String GREEN_BOLD = "\033[1;32m";  // GREEN
    public static final String YELLOW_BOLD = "\033[1;33m"; // YELLOW
    public static final String BLUE_BOLD = "\033[1;34m";   // BLUE
    public static final String PURPLE_BOLD = "\033[1;35m"; // PURPLE
    public static final String CYAN_BOLD = "\033[1;36m";   // CYAN
    public static final String WHITE_BOLD = "\033[1;37m";  // WHITE

    // Underline
    public static final String BLACK_UNDERLINED = "\033[4;30m";  // BLACK
    public static final String RED_UNDERLINED = "\033[4;31m";    // RED
    public static final String GREEN_UNDERLINED = "\033[4;32m";  // GREEN
    public static final String YELLOW_UNDERLINED = "\033[4;33m"; // YELLOW
    public static final String BLUE_UNDERLINED = "\033[4;34m";   // BLUE
    public static final String PURPLE_UNDERLINED = "\033[4;35m"; // PURPLE
    public static final String CYAN_UNDERLINED = "\033[4;36m";   // CYAN
    public static final String WHITE_UNDERLINED = "\033[4;37m";  // WHITE

    // Background
    public static final String BLACK_BACKGROUND = "\033[40m";  // BLACK
    public static final String RED_BACKGROUND = "\033[41m";    // RED
    public static final String GREEN_BACKGROUND = "\033[42m";  // GREEN
    public static final String YELLOW_BACKGROUND = "\033[43m"; // YELLOW
    public static final String BLUE_BACKGROUND = "\033[44m";   // BLUE
    public static final String PURPLE_BACKGROUND = "\033[45m"; // PURPLE
    public static final String CYAN_BACKGROUND = "\033[46m";   // CYAN
    public static final String WHITE_BACKGROUND = "\033[47m";  // WHITE

    // High Intensity
    public static final String BLACK_BRIGHT = "\033[0;90m";  // BLACK
    public static final String RED_BRIGHT = "\033[0;91m";    // RED
    public static final String GREEN_BRIGHT = "\033[0;92m";  // GREEN
    public static final String YELLOW_BRIGHT = "\033[0;93m"; // YELLOW
    public static final String BLUE_BRIGHT = "\033[0;94m";   // BLUE
    public static final String PURPLE_BRIGHT = "\033[0;95m"; // PURPLE
    public static final String CYAN_BRIGHT = "\033[0;96m";   // CYAN
    public static final String WHITE_BRIGHT = "\033[0;97m";  // WHITE

    // Bold High Intensity
    public static final String BLACK_BOLD_BRIGHT = "\033[1;90m"; // BLACK
    public static final String RED_BOLD_BRIGHT = "\033[1;91m";   // RED
    public static final String GREEN_BOLD_BRIGHT = "\033[1;92m"; // GREEN
    public static final String YELLOW_BOLD_BRIGHT = "\033[1;93m";// YELLOW
    public static final String BLUE_BOLD_BRIGHT = "\033[1;94m";  // BLUE
    public static final String PURPLE_BOLD_BRIGHT = "\033[1;95m";// PURPLE
    public static final String CYAN_BOLD_BRIGHT = "\033[1;96m";  // CYAN
    public static final String WHITE_BOLD_BRIGHT = "\033[1;97m"; // WHITE

    // High Intensity backgrounds
    public static final String BLACK_BACKGROUND_BRIGHT = "\033[0;100m";// BLACK
    public static final String RED_BACKGROUND_BRIGHT = "\033[0;101m";// RED
    public static final String GREEN_BACKGROUND_BRIGHT = "\033[0;102m";// GREEN
    public static final String YELLOW_BACKGROUND_BRIGHT = "\033[0;103m";// YELLOW
    public static final String BLUE_BACKGROUND_BRIGHT = "\033[0;104m";// BLUE
    public static final String PURPLE_BACKGROUND_BRIGHT = "\033[0;105m"; // PURPLE
    public static final String CYAN_BACKGROUND_BRIGHT = "\033[0;106m";  // CYAN
    public static final String WHITE_BACKGROUND_BRIGHT = "\033[0;107m";   // WHITE

    public static String Letter(String letter, int row) {
        ArrayList<String> letterLines = new ArrayList<String>();

        switch(letter.toUpperCase()) {
            case "A":
                letterLines.add(" █████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("███████║");
                letterLines.add("██╔══██║");
                letterLines.add("██║  ██║");
                letterLines.add("╚═╝  ╚═╝");
                break;
            case "B":
                letterLines.add("██████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██████╦╝");
                letterLines.add("██╔══██╗");
                letterLines.add("██████╦");
                letterLines.add("╚═════╝ ");
                break;
            case "C":
                letterLines.add(" █████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██║  ╚═╝");
                letterLines.add("██║  ██╗");
                letterLines.add("╚█████╔╝");
                letterLines.add(" ╚════╝ ");
                break;
            case "D":
                letterLines.add("██████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██║  ██║");
                letterLines.add("██║  ██║");
                letterLines.add("██████╔╝");
                letterLines.add("╚═════╝ ");
                break;
            case "E":
                letterLines.add("███████╗");
                letterLines.add("██╔════╝");
                letterLines.add("█████╗  ");
                letterLines.add("██╔══╝  ");
                letterLines.add("███████╗");
                letterLines.add("╚══════╝");
                break;
            case "F":
                letterLines.add("███████╗");
                letterLines.add("██╔════╝");
                letterLines.add("█████╗  ");
                letterLines.add("██╔══╝  ");
                letterLines.add("██║     ");
                letterLines.add("╚═╝     ");
                break;
            case "G":
                letterLines.add(" ██████╗ ");
                letterLines.add("██╔════╝ ");
                letterLines.add("██║  ██╗ ");
                letterLines.add("██║  ╚██╗");
                letterLines.add("╚██████╔╝");
                letterLines.add(" ╚═════╝ ");
                break;
            case "H":
                letterLines.add("██╗  ██╗");
                letterLines.add("██║  ██║");
                letterLines.add("███████║");
                letterLines.add("██╔══██║");
                letterLines.add("██║  ██║");
                letterLines.add("╚═╝  ╚═╝");
                break;
            case "I":
                letterLines.add("██╗");
                letterLines.add("██║");
                letterLines.add("██║");
                letterLines.add("██║");
                letterLines.add("██║");
                letterLines.add("╚═╝");
                break;
            case "J":
                letterLines.add("     ██╗");
                letterLines.add("     ██║");
                letterLines.add("     ██║");
                letterLines.add("██╗  ██║");
                letterLines.add("╚█████╔╝");
                letterLines.add(" ╚════╝ ");
                break;
            case "K":
                letterLines.add("██╗  ██╗");
                letterLines.add("██║ ██╔╝");
                letterLines.add("█████═╝ ");
                letterLines.add("██╔═██╗ ");
                letterLines.add("██║ ╚██╗");
                letterLines.add("╚═╝  ╚═╝");
                break;
            case "L":
                letterLines.add("██╗     ");
                letterLines.add("██║     ");
                letterLines.add("██║     ");
                letterLines.add("██║     ");
                letterLines.add("███████╗");
                letterLines.add("╚══════╝");
                break;
            case "M":
                letterLines.add("███╗   ███╗");
                letterLines.add("████╗ ████║");
                letterLines.add("██╔████╔██║");
                letterLines.add("██║╚██╔╝██║");
                letterLines.add("██║ ╚═╝ ██║");
                letterLines.add("╚═╝     ╚═╝");
                break;
            case "N":
                letterLines.add("███╗  ██╗");
                letterLines.add("████╗ ██║");
                letterLines.add("██╔██╗██║");
                letterLines.add("██║╚████║");
                letterLines.add("██║ ╚███║");
                letterLines.add("╚═╝  ╚══╝");
                break;
            case "O":
                letterLines.add(" █████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██║  ██║");
                letterLines.add("██║  ██║");
                letterLines.add("╚█████╔╝");
                letterLines.add(" ╚════╝ ");
                break;
            case "P":
                letterLines.add("██████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██████╔╝");
                letterLines.add("██╔═══╝ ");
                letterLines.add("██║     ");
                letterLines.add("╚═╝     ");
                break;
            case "Q":
                letterLines.add(" ██████╗ ");
                letterLines.add("██╔═══██╗");
                letterLines.add("██║██╗██║");
                letterLines.add("╚██████╔╝");
                letterLines.add(" ╚═██╔═╝ ");
                letterLines.add("   ╚═╝   ");
                break;
            case "R":
                letterLines.add("██████╗ ");
                letterLines.add("██╔══██╗");
                letterLines.add("██████╔╝");
                letterLines.add("██╔══██╗");
                letterLines.add("██║  ██║");
                letterLines.add("╚═╝  ╚═╝");
                break;
            case "S":
                letterLines.add(" ██████╗");
                letterLines.add("██╔════╝");
                letterLines.add("╚█████╗ ");
                letterLines.add(" ╚═══██╗");
                letterLines.add("██████╔╝");
                letterLines.add("╚═════╝ ");
                break;
            case "T":
                letterLines.add("████████╗");
                letterLines.add("╚══██╔══╝");
                letterLines.add("   ██║   ");
                letterLines.add("   ██║   ");
                letterLines.add("   ██║   ");
                letterLines.add("   ╚═╝   ");
                break;
            case "U":
                letterLines.add("██╗   ██╗");
                letterLines.add("██║   ██║");
                letterLines.add("██║   ██║");
                letterLines.add("██║   ██║");
                letterLines.add("╚██████╔╝");
                letterLines.add(" ╚═════╝ ");
                break;
            case "V":
                letterLines.add("██╗   ██╗");
                letterLines.add("██║   ██║");
                letterLines.add("╚██╗ ██╔╝");
                letterLines.add(" ╚████╔╝ ");
                letterLines.add("  ╚██╔╝  ");
                letterLines.add("   ╚═╝   ");
                break;
            case "W":
                letterLines.add("██╗       ██╗");
                letterLines.add("██║  ██╗  ██║");
                letterLines.add("╚██╗████╗██╔╝");
                letterLines.add(" ████╔═████║ ");
                letterLines.add(" ╚██╔╝ ╚██╔╝ ");
                letterLines.add("  ╚═╝   ╚═╝ ");
                break;
            case "X":
                letterLines.add("██╗  ██╗");
                letterLines.add("╚██╗██╔╝");
                letterLines.add(" ╚███╔╝ ");
                letterLines.add(" ██╔██╗ ");
                letterLines.add("██╔╝╚██╗");
                letterLines.add("╚═╝  ╚═╝");
                break;
            case "Y":
                letterLines.add("██╗   ██╗");
                letterLines.add("╚██╗ ██╔╝");
                letterLines.add(" ╚████╔╝ ");
                letterLines.add("  ╚██╔╝  ");
                letterLines.add("   ██║   ");
                letterLines.add("   ╚═╝   ");
                break;
            case "Z":
                letterLines.add("███████╗");
                letterLines.add("╚════██║");
                letterLines.add("  ███╔═╝");
                letterLines.add("██╔══╝  ");
                letterLines.add("███████╗");
                letterLines.add("╚══════╝");
                break;
            default:
                letterLines.add("       ");
                letterLines.add("       ");
                letterLines.add("       ");
                letterLines.add("       ");
                letterLines.add("       ");
                letterLines.add("       ");
        }
        return letterLines.get(row);
    }

    public static void printMessage(String msg) {
        for (int r = 0; r <= 5; r++) {
            for (int i = 0; i < msg.length(); i++) {
                System.out.print(Letter(msg.substring(i, i+1), r));
                System.out.print("  ");
            }
            System.out.println();
        }
    }

}