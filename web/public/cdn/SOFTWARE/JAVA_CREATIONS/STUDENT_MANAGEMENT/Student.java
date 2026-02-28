import java.util.Random;
/**
 * Student.java
 * 
 * Student represents a student.
 * @author Michael Cran
 * @version December 13th, 2021
 */
public class Student {
    
    // String value that holds the students name.
    String name;
    
    // int value that holds the students ID.
    int stuID;
    
    // int value that holds the students grade level.
    int gradeLevel;
    
    
    /**
     * Creates a new Student instance.
     * 
     * @param name      a String value
     *                      containing the name of the student
     * @param gradeLevel    a int value
     *                      containing the grade level of the student
     */
    public Student(String name, int gradeLevel) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        this.name = name;
        this.gradeLevel = gradeLevel;
        this.stuID = randomID();
    }
    
    /**
     * Generates a new 8 digit ID for a student.
     * @return a int of 8 digits.
     */
    public static int randomID() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        Random rnd = new Random();
        int stuID = 10000000 + rnd.nextInt(90000000);
        return stuID;
    }
    
    /**
	 * Sets this Student's name.
	 * 
	 * @param   a String value
	 *          containing the new name for the student.
	 */
    public void setName(String newName) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        name = newName;
    }

    /**
	 * Sets this Student's grade level.
	 * 
	 * @param   a int value
	 *          containing the new grade level of the student.
	 */
    public void setGradeLevel(int newGradeLevel) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        gradeLevel = newGradeLevel;
    }
    
	/**
	 * Accesses this Student's name.
	 * @return this Student's name.
	 */
    public String getName() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        return name;
    }
    
    /**
	 * Accesses this Student's grade level.
	 * @return this Student's grade level.
	 */
    public int getGradeLevel() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        return gradeLevel;
    }
    
    /**
	 * Accesses this Student's ID.
	 * @return this Student's ID.
	 */
    public int getStuID() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        return stuID;
    }
    
    /**
	 * Converts the Student's name, grade level, and ID into a string in the format: 
	 *      "[Name] (#[STUDENT ID]) is in grade [GRADE LEVEL]."
	 * This provides a useful way of printing the contents of a Deck in an easily 
	 * readable format or performing other similar functions.
	 * 
	 * @return a String value containing the name, grade level, and ID of the student.
	 */
    public String toString() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 1 *** */
        return name + " (#" + getStuID() + ") is in grade " + getGradeLevel() + ".";
    }
    
}