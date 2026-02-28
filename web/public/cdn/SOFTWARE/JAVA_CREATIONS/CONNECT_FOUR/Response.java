import java.lang.Math;
public class Response {
    private static String[] greeting = {
        "Some people eat snails. I guess they don't like fast food...", 
        "Hey, if beaches have waves do tiny beaches have microwaves?!?", 
        "Yooooo! How does the sea say hello? It waves! ", 
        "Bone-jour, I am a skeleton! Don't mess with me! I will not hold back... I have no heart."
    };
    private static String[] name = {
        "Zoe", 
        "Tray", 
        "Lauren", 
        "Corbyn",
        "Anna",
        "Devon"
    };

    public static String getGreeting() {
        int random = (int) (Math.random() * 4);
        return greeting[random];
    }
    public static String getName() {
        int random = (int) (Math.random() * 6);
        return name[random];
    }
}