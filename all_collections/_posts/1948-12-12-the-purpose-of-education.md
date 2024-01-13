---
layout: post
title: Ansible Role for Provisioning Virtual Machines in VMware VSphere
date: 2021-11-04
categories: [Ansible]
---

There are a bunch of resources available for creating VMs in VMware environments. The thing is that if we create a VM in production-ready environments, things are a bit, ah, let's say, different. When we are creating a VM by hand in a production-ready environment, there are a few things we usually do that are not directly related to the task of creating the VM. Ok, let me explain. 
    See the below flowchart. This is the most commonly used approach (not 100% complete) when we are creating VMs in production environments.


![VM Provissioning Image](https://lucid.app/publicSegments/view/fa98b297-95df-4611-8ddb-fddd46eb8a81/image.png)
_Folks please consider this is not a technical diagram this is just a diagram I have created to explain my point of view_ 

So I think you are ready to see some Ansible actions. You might need to open your VSCode. 
<br>
<br>
**_PS : In the below first, I was trying to divide and explain each task but if you just need to dive into the complete task scroll down folks._**

#### Check to see if the provided Virtual Machine Name already exists.
>Just imagine that now you are creating a new virtual machine. The first thing you are doing is providing a name. Let's say we provide that name using an Ansible variable called _"vmware_name"_.
>This will search for that given name in the VSphere. and store the outputs in the "_vm_facts" variable. ya It's that simple.
>
---
```yml
- name: Gather one specific VM's information
  community.vmware.vmware_vm_info:
    hostname: #'{{ lookup("env", "VMWARE_HOST") }}'
    username: #'{{ lookup("env", "VMWARE_USER") }}'
    password: #'{{ lookup("env", "VMWARE_PASSWORD") }}'
    validate_certs: false
    vm_name: #"{{ vmware_name }}"
  delegate_to: localhost
  register: vm_facts
```
---

