public class Display {
    public static void title() {
        System.out.println(" ██████╗ ██████╗ ███╗   ██╗███╗   ██╗███████╗ ██████╗████████╗");
        System.out.println("██╔════╝██╔═══██╗████╗  ██║████╗  ██║██╔════╝██╔════╝╚══██╔══╝");
        System.out.println("██║     ██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██║        ██║   ");
        System.out.println("██║     ██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║        ██║  ");
        System.out.println("╚██████╗╚██████╔╝██║ ╚████║██║ ╚████║███████╗╚██████╗   ██║   ");
        System.out.println(" ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝ ╚═════╝   ╚═╝   ");
        System.out.println(Color.RESET);
        System.out.println("            ███████╗ ██████╗ ██╗   ██╗██████╗ ");
        System.out.println("            ██╔════╝██╔═══██╗██║   ██║██╔══██╗");
        System.out.println("            █████╗  ██║   ██║██║   ██║██████╔╝");
        System.out.println("            ██╔══╝  ██║   ██║██║   ██║██╔══██╗");
        System.out.println("            ██║     ╚██████╔╝╚██████╔╝██║  ██║");
        System.out.println("            ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝");
        System.out.println(Color.RESET);
    }
    
    public static void bot() {
        System.out.println("       d8888 8888888b.   .d8888b.   .d8888b.        d8888      888888b.    .d88888b. 88888888888 ");
        System.out.println("      d88888 888   Y88b d88P  Y88b d88P  Y88b      d88888      888  \"88b  d88P\" \"Y88b    888     ");
        System.out.println("     d88P888 888    888 888    888 Y88b.          d88P888      888  .88P  888     888    888     ");
        System.out.println("    d88P 888 888   d88P 888         \"Y888b.      d88P 888      8888888K.  888     888    888     ");
        System.out.println("   d88P  888 8888888P\"  888            \"Y88b.   d88P  888      888  \"Y88b 888     888    888     ");
        System.out.println("  d88P   888 888        888    888       \"888  d88P   888      888    888 888     888    888     ");
        System.out.println(" d8888888888 888        Y88b  d88P Y88b  d88P d8888888888      888   d88P Y88b. .d88P    888     ");
        System.out.println("d88P     888 888         \"Y8888P\"   \"Y8888P\" d88P     888      8888888P\"   \"Y88888P\"     888     ");
    }
    
    public static void board() {
        System.out.println(Color.RESET);
        System.out.println(Color.BLUE + Color.BLUE_BACKGROUND + "+---+---+---+---+---+---+---+ " + Color.WHITE_BACKGROUND + Color.RESET);
        for (int i = 1; i <= 42; i++) {
            
            if (Game.getSlots(1).contains(i)) {
                System.out.print(Color.BLUE + Color.BLUE_BACKGROUND + "| " + Color.WHITE_BACKGROUND + Color.RESET + Color.RED_BRIGHT + Color.RED_BACKGROUND_BRIGHT + "  " + Color.RESET + "");
            } else if (Game.getSlots(2).contains(i)) {
                System.out.print(Color.BLUE + Color.BLUE_BACKGROUND + "| " + Color.WHITE_BACKGROUND + Color.RESET + Color.YELLOW_BRIGHT + Color.YELLOW_BACKGROUND_BRIGHT + "  " + Color.RESET + "");
            } else {
                System.out.print(Color.BLUE + Color.BLUE_BACKGROUND + "| " + Color.WHITE_BACKGROUND + Color.RESET + "  " + Color.WHITE_BACKGROUND + Color.RESET );
            }
            if (i == 7 || i == 14 || i == 21 || i == 28 || i == 35 || i == 42) {
                System.out.println(Color.BLUE + Color.BLUE_BACKGROUND + "| " + Color.WHITE_BACKGROUND + Color.RESET );
                System.out.println(Color.BLUE + Color.BLUE_BACKGROUND + "+---+---+---+---+---+---+---+ " + Color.WHITE_BACKGROUND + Color.RESET );
            }
            
    

        }
        System.out.print(Color.BLUE + Color.BLUE_BACKGROUND + "  " + Color.RESET);
        for (int i = 1; i <= 7; i++) {
            if (i == 1) {
                System.out.print("▲ ");
            } else {
                System.out.print("  ▲ ");
            }
        }
        System.out.print(Color.BLUE + Color.BLUE_BACKGROUND + "  " + Color.RESET);
        System.out.println(Color.RESET);
        for (int i = 1; i <= 7; i++) {
            System.out.print("  " + i + " ");
        }
        
        System.out.println(Color.RESET);
        System.out.println(Color.RESET);
    }
}