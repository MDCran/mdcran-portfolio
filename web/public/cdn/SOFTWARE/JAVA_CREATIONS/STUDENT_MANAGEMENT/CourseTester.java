/**
 * This is a class that tests the Course class.
 */
public class CourseTester {
    /**
     * The main method in this class checks the Course operations for consistency.
     */
    public static void main(String[] args) {
        System.out.println("==============================================");
        System.out.println("[ACTIVITY #2] - Design & Create a Course Class");
        System.out.println("==============================================");
        System.out.println();
        
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        Student stu1 = new Student("Andrew Adams", 9);
        Student stu2 = new Student("George Jackson", 12);
        Student stu3 = new Student("John Washington", 11);
        
        Course rotc = new Course("Reserve Officers' Training Corps", "Mr. Morales", 0);
        rotc.enroll(stu1);
        rotc.enroll(stu2);
        rotc.enroll(stu3);
        rotc.setGrade(stu1, 99.4);
        rotc.setGrade(stu2, 97.3);
        rotc.setGrade(stu3, 92.4);
        System.out.println(rotc);
        
        Student stu4 = new Student("Michael Cran", 12);
        Student stu5 = new Student("Jacob Hearther", 12);
        Student stu6 = new Student("William Pearce ", 12);
        
        System.out.println();
        
        Course apcsa = new Course("AP Computer Science", "Mr. Alfano", 6);
        apcsa.enroll(stu4);
        apcsa.enroll(stu5);
        apcsa.enroll(stu6);
        apcsa.setGrade(stu4, 94.0);
        apcsa.setGrade(stu5, 98.4);
        apcsa.setGrade(stu6, 95.2);
        System.out.println(apcsa);
    }
}