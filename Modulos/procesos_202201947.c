#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("202201947");
MODULE_DESCRIPTION("Modulo para leer informacion de procesos del sistema");
MODULE_VERSION("1.0");

#define PROC_NAME "procesos_202201947"

/*
    Esta función se encarga de obtener la información de los procesos
*/
static int procinfo_show(struct seq_file *m, void *v) {
    struct task_struct *task;
    int total_procesos = 0;
    int procesos_corriendo = 0;
    int procesos_durmiendo = 0;
    int procesos_zombie = 0;
    int procesos_parados = 0;
    
    // Recorrer todos los procesos del sistema
    rcu_read_lock();
    for_each_process(task) {
        total_procesos++;
        
        // Verificar el estado del proceso
        switch (task->__state) {
            case TASK_RUNNING:
                procesos_corriendo++;
                break;
            case TASK_INTERRUPTIBLE:
            case TASK_UNINTERRUPTIBLE:
                procesos_durmiendo++;
                break;
            case TASK_STOPPED:
            case TASK_TRACED:
                procesos_parados++;
                break;
            default:
                // Para procesos zombie y otros estados
                if (task->exit_state == EXIT_ZOMBIE || task->exit_state == EXIT_DEAD) {
                    procesos_zombie++;
                }
                break;
        }
    }
    rcu_read_unlock();
    
    // Imprimir en formato JSON según la estructura solicitada
    seq_printf(m, "{\n\t\"procesos_corriendo\": %d,\n\t\"total_procesos\": %d,\n\t\"procesos_durmiendo\": %d,\n\t\"procesos_zombie\": %d,\n\t\"procesos_parados\": %d\n}\n",
                procesos_corriendo, total_procesos, procesos_durmiendo, procesos_zombie, procesos_parados);
    
    return 0;
}

/*
    Esta función se ejecuta cuando se abre el archivo en /proc
*/
static int procinfo_open(struct inode *inode, struct file *file) {
    return single_open(file, procinfo_show, NULL);
}

/*
    Estructura con las operaciones del archivo /proc
*/
static const struct proc_ops procinfo_ops = {
    .proc_open = procinfo_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

/*
    Función de inicialización del módulo
*/
static int __init procinfo_init(void) {
    struct proc_dir_entry *entry;
    
    // Crear archivo en /proc
    entry = proc_create(PROC_NAME, 0444, NULL, &procinfo_ops);
    if (!entry) {
        printk(KERN_ERR "procinfo: No se pudo crear /proc/%s\n", PROC_NAME);
        return -ENOMEM;
    }
    
    printk(KERN_INFO "procinfo module loaded - /proc/%s creado\n", PROC_NAME);
    return 0;
}

/*
    Función de limpieza del módulo
*/
static void __exit procinfo_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "procinfo module unloaded - /proc/%s eliminado\n", PROC_NAME);
}

module_init(procinfo_init);
module_exit(procinfo_exit);