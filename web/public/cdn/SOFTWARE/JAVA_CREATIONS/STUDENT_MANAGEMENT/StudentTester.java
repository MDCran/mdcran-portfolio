/**
 * This is a class that tests the Student class.
 */
public class StudentTester
{
    /**
     * The main method in this class checks the Student operations for consistency.
     */
    public static void main(String[] args)
    {
        System.out.println("==============================================");
        System.out.println("[ACTIVITY #1] - Design & Create a Student Class");
        System.out.println("==============================================");
        System.out.println();
        
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        Student stu1 = new Student("Andrew Adams", 9);
        Student stu2 = new Student("George Jackson", 12);
        Student stu3 = new Student("John Washington", 11);
        
        System.out.println("stu1 = " + stu1);
        System.out.println("stu1.getName() = " + stu1.getName());
        System.out.println("stu1.getGradeLevel() = " + stu1.getGradeLevel());
        System.out.println("stu1.getStuID() = " + stu1.getStuID());

        System.out.println();

        System.out.println("stu2 = " + stu2);
        System.out.println("stu2.getName() = " + stu2.getName());
        System.out.println("stu2.getGradeLevel() = " + stu2.getGradeLevel());
        System.out.println("stu2.getStuID() = " + stu2.getStuID());
        
        System.out.println();
        
        System.out.println("stu3 = " + stu3);
        System.out.println("stu3.getName() = " + stu3.getName());
        System.out.println("stu3.getGradeLevel() = " + stu3.getGradeLevel());
        System.out.println("stu3.getStuID() = " + stu3.getStuID());
    }
}