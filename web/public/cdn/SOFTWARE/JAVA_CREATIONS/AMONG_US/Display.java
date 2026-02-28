public class Display {
    public static void display2DMap(Map map, Player player) {
        for(int i = 0; i < map.getMap().size(); i++) {
            String lineReading = map.getMap().get(i);
            String playersInRoom = "";
            String playerDisplay = "          ";
            int lineNumCalc = player.getLocation().getLineNum();
            int playerRoomCount = 0;



            for (int j = 0; j < map.getPlayers().size(); j++) {
                if (map.getPlayers().get(j).getLocation().getLocName().equalsIgnoreCase(player.getLocation().getLocName())) {
                    playersInRoom += Terminal.fontColor(map.getPlayers().get(j).getColor()) + "●";
                    playerRoomCount++;
                }
            }
            for (int k = playerRoomCount; k < 10; k+=2) {
                if (k + 2 <= 10) {
                    playersInRoom = " " + playersInRoom + " ";
                } else {
                    playersInRoom = " " + playersInRoom + "";
                }

            }

            if (i == lineNumCalc) {
                playerDisplay = playersInRoom;
                lineReading = lineReading.replace("----------", playerDisplay);
            } else {
                playerDisplay = "          ";
                lineReading = lineReading.replace("----------", "          ");
            }



            lineReading = lineReading.replace("░", Terminal.RESET + Terminal.BLACK + Terminal.BLACK_BACKGROUND + "░" + Terminal.RESET);
            lineReading = lineReading.replace("█", Terminal.RESET + Terminal.WHITE + Terminal.WHITE_BACKGROUND + "█" + Terminal.RESET);
            lineReading = lineReading.replace("*", Terminal.RESET + Terminal.WHITE + Terminal.BLACK_BACKGROUND + "*" + Terminal.RESET);
            lineReading = lineReading.replace("▓", Terminal.RESET + Terminal.fontColor(player.getColor()) + Terminal.backgroundColor(player.getColor()) + " " + Terminal.RESET);
            lineReading = lineReading.replace("Ξ", Terminal.RESET + Terminal.BLACK_BACKGROUND + Terminal.WHITE + "Ξ" + Terminal.RESET);
            System.out.println(lineReading);
        }
    }

}